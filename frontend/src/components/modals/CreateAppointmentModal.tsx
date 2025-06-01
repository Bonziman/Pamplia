// src/components/modals/CreateAppointmentModal.tsx
// --- FULL REPLACEMENT - INTEGRATED AVAILABILITY FETCHING & ENHANCED TIME SELECTION ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CustomCalendar.css'; // Ensure your custom calendar styles are applied
import { format, startOfDay, parse, isValid, addMinutes } from 'date-fns';
import {
    Box, Button as ChakraButton, FormControl, FormLabel, Input, FormErrorMessage,
    VStack, HStack, Text, Grid, GridItem, Spinner, Center,
    SimpleGrid, useTheme, Heading,
    Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import RightDrawerModal from './RightDrawerModal'; // Your existing component
import { PublicService, AppointmentCreatePayload, createPublicAppointment, fetchAvailability } from '../../api/publicApi';
import { AvailabilityResponse } from '../../types/Availability';
import { useBrandedToast } from '../../hooks/useBrandedToast';

// --- CONSTANTS ---
const SLOT_STEP_MINUTES = 15; // IMPORTANT: Match your backend's slotting logic

// --- TYPES ---
type CalendarValue = Date | null;

interface ClientPreInfo {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface CreateAppointmentFormData {
    client_name: string;
    client_email: string;
    client_phone?: string;
    selected_date: Date | null;
    selected_time: string;
    service_ids: number[];
}

interface TimeSegment {
  id: string;
  title: string;
  slots: string[];
  slotCount: number;
}

// --- VALIDATION SCHEMA ---
const validationSchema = yup.object().shape({
    client_name: yup.string().trim().required('Client name is required').min(2, 'Name is too short'),
    client_email: yup.string().email('Invalid email format').required('Client email is required'),
    client_phone: yup.string().trim().optional().matches(/^$|^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/, 'Invalid phone number format'),
    selected_date: yup.date().nullable().required('Please select a date.').typeError('Invalid date selected.')
        .min(startOfDay(new Date()), "Cannot select a past date."),
    selected_time: yup.string().required('Please select an available time slot.'),
    service_ids: yup.array().of(yup.number().integer()).min(1, 'Please select at least one service.').required(),
});

// --- PROPS ---
interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated: () => void;
  tenantServices: PublicService[];
  isLoadingServices: boolean;
  initialDate?: Date | null;
  clientPreInfo?: ClientPreInfo;
}

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAppointmentCreated,
  tenantServices,
  isLoadingServices,
  initialDate,
  clientPreInfo
}) => {
  const theme = useTheme();
  const toast = useBrandedToast();
  
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [expandedSegmentIndices, setExpandedSegmentIndices] = useState<number[]>([0]);


  const { control, register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<CreateAppointmentFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
        client_name: '',
        client_email: '',
        client_phone: '',
        selected_date: startOfDay(new Date()),
        selected_time: '',
        service_ids: [],
    }
  });

  const selectedDateValue = watch('selected_date');
  const selectedServiceIdsValue = watch('service_ids', []);
  const selectedTimeValue = watch('selected_time');

  // Effect to reset form and prefill when modal opens
  useEffect(() => {
    if (isOpen) {
      let defaultDate = initialDate ? startOfDay(initialDate) : startOfDay(new Date());
      if (defaultDate < startOfDay(new Date())) {
        defaultDate = startOfDay(new Date());
      }
      reset({
        client_name: clientPreInfo?.name || '',
        client_email: clientPreInfo?.email || '',
        client_phone: clientPreInfo?.phone || '',
        selected_date: defaultDate,
        selected_time: '',
        service_ids: [],
      });
      setAvailableTimes([]); 
      setTimeSegments([]);
      setExpandedSegmentIndices([0]);
      setAvailabilityError(null);
      setIsLoadingTimes(false);
    }
  }, [isOpen, initialDate, clientPreInfo, reset]);

  // --- HELPER FUNCTIONS ---
  const parseTimeToMinutes = useCallback((time: string): number => {
    if (!time || !time.includes(':')) return 0; // Should not happen with valid "HH:mm"
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const formatTimeFromMinutes = useCallback((totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, []);

  const calculateTotalServiceDuration = useCallback((): number => {
    if (!tenantServices || tenantServices.length === 0 || selectedServiceIdsValue.length === 0) {
        return 0;
    }
    return selectedServiceIdsValue.reduce((total, sId) => {
        const service = tenantServices.find(s => s.id === sId);
        return total + (service ? service.duration_minutes : 0);
    }, 0);
  }, [selectedServiceIdsValue, tenantServices]);

  const segmentAvailableTimes = useCallback((times: string[], stepMinutes: number): TimeSegment[] => {
    if (!times.length) return [];
    
    const sortedTimes = [...times].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    const segments: TimeSegment[] = [];
    let currentSegmentSlots: string[] = [];
    let segmentCounter = 0;

    sortedTimes.forEach((time, index) => {
        currentSegmentSlots.push(time);
        const nextTime = sortedTimes[index + 1];
        let isLastSlotInBlock = false;

        if (!nextTime) {
            isLastSlotInBlock = true;
        } else {
            const currentTimeMins = parseTimeToMinutes(time);
            const nextTimeMins = parseTimeToMinutes(nextTime);
            if (nextTimeMins - currentTimeMins > stepMinutes) {
                isLastSlotInBlock = true;
            }
        }

        if (isLastSlotInBlock && currentSegmentSlots.length > 0) {
            const firstSlotTime = currentSegmentSlots[0];
            const lastSlotInSegment = currentSegmentSlots[currentSegmentSlots.length - 1];
            
            const firstSlotHour = parseInt(firstSlotTime.split(':')[0], 10);
            let category = "Time Block";
            if (firstSlotHour < 12) category = "Morning";
            else if (firstSlotHour < 17) category = "Afternoon";
            else category = "Evening";
            
            // For title, show range of first slot to last slot in this identified block
            const title = `${category} (${firstSlotTime} - ${lastSlotInSegment})`;
            
            segments.push({
                id: `segment-${segmentCounter++}-${firstSlotTime.replace(":", "")}`,
                title: title,
                slots: [...currentSegmentSlots],
                slotCount: currentSegmentSlots.length,
            });
            currentSegmentSlots = [];
        }
    });
    return segments;
  }, [parseTimeToMinutes]);


  // Callback to fetch available times
  const fetchTimesForSelection = useCallback(async (date: Date | null, serviceIds: number[]) => {
    if (!isOpen || !date || serviceIds.length === 0) {
      setAvailableTimes([]);
      setValue('selected_time', '');
      if (isOpen && date && serviceIds.length === 0) {
        setAvailabilityError("Select service(s) to see times.");
      } else if (isOpen && !date && serviceIds.length > 0) {
        setAvailabilityError("Select a date to see times.");
      } else {
        setAvailabilityError(null);
      }
      return;
    }

    setIsLoadingTimes(true);
    setAvailabilityError(null);
    setValue('selected_time', ''); 

    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const response: AvailabilityResponse = await fetchAvailability(dateString, serviceIds);
      // Ensure slots are sorted, primarily for "Next Available" and consistent segment creation
      const sortedSlots = response.available_slots.sort((a,b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
      setAvailableTimes(sortedSlots);

      if (sortedSlots.length === 0) {
        setAvailabilityError(`No times found for ${format(date, 'MMM d, yyyy')}. Try different services or date.`);
      }
    } catch (error: any) {
      console.error("Failed to fetch available times:", error);
      const message = error.response?.data?.detail || error.message || "Could not fetch available times.";
      setAvailabilityError(message);
      setAvailableTimes([]);
    } finally {
      setIsLoadingTimes(false);
    }
  }, [isOpen, setValue, parseTimeToMinutes]);

  // useEffect to trigger fetchTimesForSelection
  useEffect(() => {
    if (selectedDateValue && selectedServiceIdsValue.length > 0) {
        fetchTimesForSelection(selectedDateValue, selectedServiceIdsValue);
    } else {
        setAvailableTimes([]); // Clear times if no date or services
        setAvailabilityError(null);
         if (selectedDateValue && selectedServiceIdsValue.length === 0) {
             setAvailabilityError("Please select at least one service.");
         } else if (!selectedDateValue && selectedServiceIdsValue.length > 0) {
             setAvailabilityError("Please select a date.");
         }
    }
  }, [selectedDateValue, selectedServiceIdsValue, fetchTimesForSelection]);

  // useEffect to process availableTimes into segments and manage accordion expansion
  useEffect(() => {
    if (availableTimes.length > 0) {
      const newSegments = segmentAvailableTimes(availableTimes, SLOT_STEP_MINUTES);
      setTimeSegments(newSegments);

      // Determine which segment to expand
      if (selectedTimeValue) {
        const segmentIndex = newSegments.findIndex(seg => seg.slots.includes(selectedTimeValue));
        if (segmentIndex !== -1) {
          setExpandedSegmentIndices([segmentIndex]);
        } else if (newSegments.length > 0) {
          setExpandedSegmentIndices([0]); // Fallback to first if selected slot's segment not found
        } else {
          setExpandedSegmentIndices([]);
        }
      } else if (newSegments.length > 0) {
        setExpandedSegmentIndices([0]); // Default to opening the first segment
      } else {
        setExpandedSegmentIndices([]);
      }
    } else {
      setTimeSegments([]);
      setExpandedSegmentIndices([]);
    }
  }, [availableTimes, segmentAvailableTimes, selectedTimeValue]);


  const handleServiceToggle = (serviceId: number) => {
    const currentIds = watch('service_ids') || [];
    const newSelectedIds = currentIds.includes(serviceId)
        ? currentIds.filter(id => id !== serviceId)
        : [...currentIds, serviceId];
    setValue('service_ids', newSelectedIds, { shouldValidate: true });
  };

  const handleNextAvailable = () => {
    if (availableTimes.length > 0) {
      setValue('selected_time', availableTimes[0], { shouldValidate: true });
    }
  };

  const formatCurrencyLocal = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)} DH`;
  };

  const onFormSubmit: SubmitHandler<CreateAppointmentFormData> = async (data) => {
    if (!data.selected_date) {
        toast({ title: "Validation Error", description: "Please select a date.", status: "error" });
        return;
    }
    try {
      const dateString = format(data.selected_date, 'yyyy-MM-dd');
      const dateTimeString = `${dateString} ${data.selected_time}`;
      
      // Use date-fns to parse and ensure it's valid
      const parsedDate = parse(data.selected_time, 'HH:mm', data.selected_date);
      const appointmentDateTime = new Date(
        data.selected_date.getFullYear(),
        data.selected_date.getMonth(),
        data.selected_date.getDate(),
        parsedDate.getHours(),
        parsedDate.getMinutes()
      );

      if (!isValid(appointmentDateTime)) {
         throw new Error("Invalid date or time selected. Please re-check.");
      }
      // Send appointment time in UTC ISO format
      const appointmentIsoTime = appointmentDateTime.toISOString();

      const payload: AppointmentCreatePayload = {
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone || undefined,
        appointment_time: appointmentIsoTime, // This will be UTC if server expects UTC
        service_ids: data.service_ids,
      };

      await createPublicAppointment(payload);

      toast({
          title: "Appointment Created!",
          description: "The new appointment has been successfully booked.",
          status: "success",
      });
      onAppointmentCreated();
      onClose();

    } catch (apiError: any) {
      console.error("Create appointment failed in modal:", apiError);
      const message = apiError.response?.data?.detail || apiError.message || "Failed to create appointment.";
      toast({ title: "Creation Failed", description: message, status: "error" });
    }
  };
  
  const areClientFieldsDisabled = clientPreInfo != null && (!!clientPreInfo.name && !!clientPreInfo.email);

  const renderFooter = () => (
    <HStack justifyContent="flex-end" w="full" spacing="3">
        <ChakraButton variant="outline" onClick={onClose} isDisabled={isSubmitting}>Cancel</ChakraButton>
        <ChakraButton
            type="submit"
            form="create-appointment-form-id"
            colorScheme="brand"
            isLoading={isSubmitting}
            isDisabled={isLoadingServices || isLoadingTimes || selectedServiceIdsValue.length === 0 || !selectedDateValue || !selectedTimeValue || !watch('client_name') || !watch('client_email')}
        >
            Create Appointment
        </ChakraButton>
    </HStack>
  );
  
  const totalSelectedServiceDuration = useMemo(calculateTotalServiceDuration, [calculateTotalServiceDuration]);

  return (
    <RightDrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Appointment"
      footerContent={renderFooter()}
      size="xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} id="create-appointment-form-id">
        <Grid templateColumns={{ base: "1fr", lg: "1.3fr 1fr" }} gap={{ base: 4, md: 6 }}>
          {/* ----- Left Column: Client Info & Services ----- */}
          <GridItem>
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="sm" color="gray.700" fontWeight="semibold">Client Information</Heading>
              <FormControl isInvalid={!!errors.client_name} isRequired>
                <FormLabel htmlFor="client_name_create_appt" fontSize="sm">Client Name</FormLabel>
                <Input id="client_name_create_appt" {...register('client_name')} isDisabled={isSubmitting || areClientFieldsDisabled} placeholder="Full name"/>
                <FormErrorMessage>{errors.client_name?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.client_email} isRequired>
                <FormLabel htmlFor="client_email_create_appt" fontSize="sm">Client Email</FormLabel>
                <Input id="client_email_create_appt" type="email" {...register('client_email')} isDisabled={isSubmitting || areClientFieldsDisabled} placeholder="email@example.com"/>
                <FormErrorMessage>{errors.client_email?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.client_phone}>
                <FormLabel htmlFor="client_phone_create_appt" fontSize="sm">Client Phone</FormLabel>
                <Input id="client_phone_create_appt" type="tel" {...register('client_phone')} isDisabled={isSubmitting || areClientFieldsDisabled} placeholder="(Optional)"/>
                <FormErrorMessage>{errors.client_phone?.message}</FormErrorMessage>
              </FormControl>

              <Heading as="h3" size="sm" color="gray.700" fontWeight="semibold" mt="3">Select Service(s)</Heading>
              <FormControl isInvalid={!!errors.service_ids} isRequired>
                {isLoadingServices ? (
                    <Center h="100px"><Spinner color="brand.500" /></Center>
                ) : tenantServices.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mt={1}>
                    {tenantServices.map(service => (
                      <Box
                        key={service.id}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={selectedServiceIdsValue.includes(service.id) ? 'brand.500' : 'gray.200'}
                        bg={selectedServiceIdsValue.includes(service.id) ? 'brand.50' : 'white'}
                        onClick={() => !isSubmitting && handleServiceToggle(service.id)}
                        cursor="pointer" role="checkbox" aria-checked={selectedServiceIdsValue.includes(service.id)}
                        tabIndex={0} _hover={{ borderColor: 'brand.300' }}
                        boxShadow={selectedServiceIdsValue.includes(service.id) ? `0 0 0 1px ${theme.colors.brand[500]}` : 'sm'}
                        transition="all 0.2s ease-in-out"
                      >
                        <Text fontWeight="medium" fontSize="sm">{service.name}</Text>
                        <Text fontSize="xs" color="gray.500">{service.duration_minutes} mins • {formatCurrencyLocal(service.price)}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : ( <Text color="gray.500" fontSize="sm">No services available for booking.</Text> )}
                <FormErrorMessage mt={2}>{errors.service_ids?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          </GridItem>

          {/* ----- Right Column: Date & Time ----- */}
          <GridItem>
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="sm" color="gray.700" fontWeight="semibold">Select Date & Time</Heading>
              <FormControl isInvalid={!!errors.selected_date} isRequired>
                <FormLabel htmlFor="selected_date_hidden_input_ca" srOnly>Selected Date</FormLabel>
                <Controller
                    name="selected_date"
                    control={control}
                    render={({ field }) => (
                        <Box className="calendar-wrapper" borderWidth="1px" borderColor="gray.200" borderRadius="md" p="1" bg="white" boxShadow="sm">
                            <Calendar
                                onChange={(value) => {
                                    const newDate = value instanceof Date ? startOfDay(value) : Array.isArray(value) && value[0] instanceof Date ? startOfDay(value[0]) : null;
                                    field.onChange(newDate);
                                }}
                                value={field.value}
                                minDate={startOfDay(new Date())}
                                tileDisabled={({ date, view }) => view === 'month' && date < startOfDay(new Date())}
                                className="appointment-calendar-chakra"
                            />
                        </Box>
                    )}
                />
                <FormErrorMessage>{errors.selected_date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.selected_time} isRequired>
                <FormLabel htmlFor="selected_time_create_appt" fontSize="sm">
                    Available Times for {selectedDateValue ? format(selectedDateValue, 'MMM d, yyyy') : 'selected date'}
                </FormLabel>
                
                {/* Next Available Button */}
                {availableTimes.length > 0 && !isLoadingTimes && !availabilityError && selectedServiceIdsValue.length > 0 && (
                  <ChakraButton onClick={handleNextAvailable} colorScheme="green" size="sm" mb={3} variant="outline" isFullWidth>
                    Select Next Available ({availableTimes[0]})
                  </ChakraButton>
                )}

                {/* Time Segments Accordion */}
                {isLoadingTimes ? ( <Center h="100px"><Spinner color="brand.500" /></Center> )
                : availabilityError ? ( <Text color="red.500" fontSize="sm" mt="1">{availabilityError}</Text> )
                : selectedDateValue && selectedServiceIdsValue.length > 0 && timeSegments.length > 0 ? (
                  <Accordion 
                    allowToggle // Allow deselecting a segment by clicking again, or allowMultiple={false} for only one open
                    index={expandedSegmentIndices} 
                    onChange={(indices) => setExpandedSegmentIndices(typeof indices === 'number' ? [indices] : indices as number[])}
                    borderWidth="1px" borderRadius="md" borderColor="gray.200"
                  >
                    {timeSegments.map((segment) => (
                      <AccordionItem key={segment.id} isDisabled={isSubmitting}>
                        <h3>
                          <AccordionButton _expanded={{ bg: 'brand.50', color: 'brand.700' }} _hover={{bg: "gray.50"}}>
                            <Box flex="1" textAlign="left" fontWeight="medium" fontSize="sm">
                              {segment.title}
                            </Box>
                            <Text fontSize="xs" color="gray.500" mr={2} fontWeight="normal">
                              {segment.slotCount} slots
                            </Text>
                            <AccordionIcon />
                          </AccordionButton>
                        </h3>
                        <AccordionPanel pb={3} pt={2} bg="white">
                          <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={2}>
                            {segment.slots.map(time => (
                              <ChakraButton
                                key={time}
                                variant={selectedTimeValue === time ? "solid" : "outline"}
                                colorScheme={selectedTimeValue === time ? "brand" : "gray"}
                                fontWeight="normal"
                                size="sm"
                                onClick={() => {
                                  if (!isSubmitting) {
                                    setValue('selected_time', time, { shouldValidate: true });
                                  }
                                }}
                                isDisabled={isSubmitting}
                              >
                                {time}
                              </ChakraButton>
                            ))}
                          </SimpleGrid>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) 
                : selectedDateValue && selectedServiceIdsValue.length > 0 && !isLoadingTimes ? (
                    <Text color="gray.500" fontSize="sm" mt="1">No available times found for the selected date/services. Please try different options.</Text>
                  )
                : (
                  <Text color="gray.500" fontSize="sm" mt="1">
                    { !selectedDateValue ? "Please select a date first." : "Please select at least one service to see times."}
                  </Text>
                )}

                {/* Display selected time range */}
                {selectedTimeValue && totalSelectedServiceDuration > 0 && !isLoadingTimes && (
                    <Text fontSize="sm" color="blue.600" mt={3} fontWeight="medium" textAlign="center">
                        Selected Appointment: {selectedTimeValue} - {formatTimeFromMinutes(parseTimeToMinutes(selectedTimeValue) + totalSelectedServiceDuration)}
                        {' '}
                        ({totalSelectedServiceDuration} mins)
                    </Text>
                )}
                <FormErrorMessage>{errors.selected_time?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          </GridItem>
        </Grid>
      </form>
    </RightDrawerModal>
  );
};

export default CreateAppointmentModal;
