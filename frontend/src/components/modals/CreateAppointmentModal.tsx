// src/components/modals/CreateAppointmentModal.tsx
// --- 2-STEP BOOKING WIZARD ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CustomCalendar.css';
import { format, startOfDay, parse, isValid } from 'date-fns';
import {
    Box, Button as ChakraButton, FormControl, FormLabel, Input, FormErrorMessage,
    VStack, HStack, Text, Grid, GridItem, Spinner, Center,
    SimpleGrid, Heading, Badge, Divider, Icon, Flex, SlideFade,
} from '@chakra-ui/react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    User, Scissors, CalendarDays, Clock, Check, ArrowRight, ArrowLeft,
    Zap, Sunrise, Sun, Sunset,
} from 'lucide-react';

import RightDrawerModal from './RightDrawerModal';
import { AppointmentCreatePayload, createPublicAppointment, fetchAvailability } from '../../api/publicApi';
import { FetchedService } from '../../api/serviceApi';
import { AvailabilityResponse } from '../../types/Availability';
import { useBrandedToast } from '../../hooks/useBrandedToast';

// --- CONSTANTS ---
const SLOT_STEP_MINUTES = 15;

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

interface TimePeriod {
    label: string;
    icon: React.ElementType;
    times: string[];
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
  onAppointmentCreated?: () => void;
  tenantServices: FetchedService[];
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
  const toast = useBrandedToast();

  // --- STEP STATE ---
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // --- AVAILABILITY STATE ---
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const { control, register, handleSubmit, watch, setValue, reset, trigger, formState: { errors, isSubmitting } } = useForm<CreateAppointmentFormData>({
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

  // --- RESET on modal open ---
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
      setAvailabilityError(null);
      setIsLoadingTimes(false);
      setCurrentStep(1);
    }
  }, [isOpen, initialDate, clientPreInfo, reset]);

  // --- HELPERS ---
  const parseTimeToMinutes = useCallback((time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const formatTimeFromMinutes = useCallback((totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, []);

  const calculateTotalServiceDuration = useCallback((): number => {
    if (!tenantServices || tenantServices.length === 0 || selectedServiceIdsValue.length === 0) return 0;
    return selectedServiceIdsValue.reduce((total, sId) => {
        const service = tenantServices.find(s => s.id === sId);
        return total + (service ? service.duration_minutes : 0);
    }, 0);
  }, [selectedServiceIdsValue, tenantServices]);

  const totalSelectedServiceDuration = useMemo(calculateTotalServiceDuration, [calculateTotalServiceDuration]);

  const totalSelectedPrice = useMemo(() => {
    return selectedServiceIdsValue.reduce((total, sId) => {
      const service = tenantServices.find(s => s.id === sId);
      return total + (service?.price || 0);
    }, 0);
  }, [selectedServiceIdsValue, tenantServices]);

  // --- CATEGORIZE AVAILABLE TIMES BY PERIOD (no accordion) ---
  const timePeriods = useMemo<TimePeriod[]>(() => {
    if (availableTimes.length === 0) return [];
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    availableTimes.forEach(time => {
      const hour = parseInt(time.split(':')[0], 10);
      if (hour < 12) morning.push(time);
      else if (hour < 17) afternoon.push(time);
      else evening.push(time);
    });

    return [
      { label: 'Morning', icon: Sunrise, times: morning },
      { label: 'Afternoon', icon: Sun, times: afternoon },
      { label: 'Evening', icon: Sunset, times: evening },
    ].filter(p => p.times.length > 0);
  }, [availableTimes]);

  // --- FETCH AVAILABILITY ---
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
      const sortedSlots = response.available_slots.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
      setAvailableTimes(sortedSlots);

      if (sortedSlots.length === 0) {
        setAvailabilityError(`No available times for ${format(date, 'EEEE, MMM d')}. Try another date.`);
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

  useEffect(() => {
    if (selectedDateValue && selectedServiceIdsValue.length > 0) {
      fetchTimesForSelection(selectedDateValue, selectedServiceIdsValue);
    } else {
      setAvailableTimes([]);
      setAvailabilityError(null);
    }
  }, [selectedDateValue, selectedServiceIdsValue, fetchTimesForSelection]);

  // --- HANDLERS ---
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

  const handleContinue = async () => {
    const valid = await trigger(['client_name', 'client_email', 'client_phone', 'service_ids']);
    if (valid) setCurrentStep(2);
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

      const payload: AppointmentCreatePayload = {
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone || undefined,
        appointment_time: appointmentDateTime.toISOString(),
        service_ids: data.service_ids,
      };

      await createPublicAppointment(payload);

      toast({
          title: "Appointment Created!",
          description: "The new appointment has been successfully booked.",
          status: "success",
      });
      onAppointmentCreated?.();
      onClose();

    } catch (apiError: any) {
      console.error("Create appointment failed:", apiError);
      const message = apiError.response?.data?.detail || apiError.message || "Failed to create appointment.";
      toast({ title: "Booking Failed", description: message, status: "error" });
    }
  };

  const areClientFieldsDisabled = clientPreInfo != null && (!!clientPreInfo.name && !!clientPreInfo.email);

  // --- STEP-AWARE FOOTER ---
  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <HStack w="full" justify="space-between">
          <ChakraButton
            variant="ghost"
            onClick={onClose}
            isDisabled={isSubmitting}
            borderRadius="xl"
            fontWeight="600"
            color="gray.500"
          >
            Cancel
          </ChakraButton>
          <ChakraButton
            colorScheme="brand"
            borderRadius="xl"
            fontWeight="600"
            size="lg"
            px={8}
            onClick={handleContinue}
            isDisabled={!watch('client_name') || !watch('client_email') || selectedServiceIdsValue.length === 0}
            rightIcon={<ArrowRight size={16} />}
          >
            Continue
          </ChakraButton>
        </HStack>
      );
    }
    return (
      <HStack w="full" justify="space-between">
        <ChakraButton
          variant="ghost"
          onClick={() => setCurrentStep(1)}
          borderRadius="xl"
          fontWeight="600"
          color="gray.500"
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </ChakraButton>
        <ChakraButton
          type="submit"
          form="create-appointment-form-id"
          colorScheme="brand"
          borderRadius="xl"
          fontWeight="700"
          size="lg"
          px={8}
          isLoading={isSubmitting}
          isDisabled={isLoadingTimes || !selectedDateValue || !selectedTimeValue}
        >
          Confirm Booking
        </ChakraButton>
      </HStack>
    );
  };

  // --- INPUT STYLE PROPS ---
  const inputStyleProps = {
    borderRadius: 'xl' as const,
    bg: 'gray.50',
    size: 'lg' as const,
    fontSize: 'sm',
    _focus: { bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' },
    _hover: { borderColor: 'gray.300' },
    _placeholder: { color: 'gray.400' },
  };

  return (
    <RightDrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Booking"
      footerContent={renderFooter()}
      size="xl"
    >
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        id="create-appointment-form-id"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && currentStep === 1) {
            e.preventDefault();
            handleContinue();
          }
        }}
      >
        {/* ====== PROGRESS BAR ====== */}
        <HStack spacing={2} mb={7}>
          <Box flex={1} h="3px" borderRadius="full" bg="brand.500" transition="background 0.4s ease" />
          <Box flex={1} h="3px" borderRadius="full" bg={currentStep >= 2 ? 'brand.500' : 'gray.200'} transition="background 0.4s ease" />
        </HStack>

        {/* ====== STEP 1: CLIENT & SERVICES ====== */}
        {currentStep === 1 && (
          <SlideFade in offsetY="16px">
            <VStack spacing={7} align="stretch">

              {/* --- Client Details Section --- */}
              <Box>
                <HStack spacing={2.5} mb={4}>
                  <Flex align="center" justify="center" w={8} h={8} borderRadius="xl" bg="blue.50">
                    <Icon as={User} boxSize={4} color="blue.500" />
                  </Flex>
                  <Box>
                    <Heading as="h3" size="sm" fontWeight="700" color="gray.800" lineHeight="1.2">Client Details</Heading>
                    <Text fontSize="xs" color="gray.400">Who is this appointment for?</Text>
                  </Box>
                </HStack>

                <VStack spacing={3}>
                  <Grid templateColumns="1fr 1fr" gap={3} w="full">
                    <GridItem>
                      <FormControl isInvalid={!!errors.client_name} isRequired>
                        <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1}>Full name</FormLabel>
                        <Input
                          {...register('client_name')}
                          placeholder="Jane Smith"
                          isDisabled={isSubmitting || areClientFieldsDisabled}
                          {...inputStyleProps}
                        />
                        <FormErrorMessage fontSize="xs">{errors.client_name?.message}</FormErrorMessage>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl isInvalid={!!errors.client_email} isRequired>
                        <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1}>Email</FormLabel>
                        <Input
                          type="email"
                          {...register('client_email')}
                          placeholder="jane@email.com"
                          isDisabled={isSubmitting || areClientFieldsDisabled}
                          {...inputStyleProps}
                        />
                        <FormErrorMessage fontSize="xs">{errors.client_email?.message}</FormErrorMessage>
                      </FormControl>
                    </GridItem>
                  </Grid>
                  <FormControl isInvalid={!!errors.client_phone}>
                    <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1}>Phone (optional)</FormLabel>
                    <Input
                      type="tel"
                      {...register('client_phone')}
                      placeholder="+212 600 000 000"
                      isDisabled={isSubmitting || areClientFieldsDisabled}
                      {...inputStyleProps}
                    />
                    <FormErrorMessage fontSize="xs">{errors.client_phone?.message}</FormErrorMessage>
                  </FormControl>
                </VStack>
              </Box>

              <Divider borderColor="gray.100" />

              {/* --- Services Section --- */}
              <Box>
                <HStack spacing={2.5} mb={4}>
                  <Flex align="center" justify="center" w={8} h={8} borderRadius="xl" bg="purple.50">
                    <Icon as={Scissors} boxSize={4} color="purple.500" />
                  </Flex>
                  <Box>
                    <Heading as="h3" size="sm" fontWeight="700" color="gray.800" lineHeight="1.2">Services</Heading>
                    <Text fontSize="xs" color="gray.400">What would they like?</Text>
                  </Box>
                </HStack>

                <FormControl isInvalid={!!errors.service_ids} isRequired>
                  {isLoadingServices ? (
                    <Center h="120px">
                      <VStack spacing={2}>
                        <Spinner color="brand.500" size="lg" />
                        <Text fontSize="xs" color="gray.400">Loading services...</Text>
                      </VStack>
                    </Center>
                  ) : tenantServices.length > 0 ? (
                    <VStack spacing={2}>
                      {tenantServices.map(service => {
                        const isSelected = selectedServiceIdsValue.includes(service.id);
                        return (
                          <Box
                            key={service.id}
                            w="full"
                            p={4}
                            borderWidth="2px"
                            borderRadius="xl"
                            borderColor={isSelected ? 'brand.500' : 'gray.100'}
                            bg={isSelected ? 'brand.50' : 'white'}
                            onClick={() => !isSubmitting && handleServiceToggle(service.id)}
                            cursor="pointer"
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                            _hover={{
                              borderColor: isSelected ? 'brand.500' : 'gray.300',
                              bg: isSelected ? 'brand.50' : 'gray.50',
                            }}
                            transition="all 0.2s ease"
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleServiceToggle(service.id); } }}
                          >
                            <HStack spacing={3} align="center">
                              {/* Check circle */}
                              <Flex
                                align="center" justify="center" flexShrink={0}
                                w={6} h={6}
                                borderRadius="full"
                                borderWidth="2px"
                                borderColor={isSelected ? 'brand.500' : 'gray.300'}
                                bg={isSelected ? 'brand.500' : 'transparent'}
                                transition="all 0.2s ease"
                              >
                                {isSelected && <Icon as={Check} boxSize={3.5} color="white" strokeWidth={3} />}
                              </Flex>

                              {/* Service info */}
                              <Box flex={1} minW={0}>
                                <Text fontWeight="600" fontSize="sm" color={isSelected ? 'brand.800' : 'gray.800'} noOfLines={1}>
                                  {service.name}
                                </Text>
                                {service.description && (
                                  <Text fontSize="xs" color="gray.400" mt={0.5} noOfLines={1}>
                                    {service.description}
                                  </Text>
                                )}
                                <HStack spacing={1} mt={1}>
                                  <Icon as={Clock} boxSize={3} color="gray.400" />
                                  <Text fontSize="xs" color="gray.500">{service.duration_minutes} min</Text>
                                </HStack>
                              </Box>

                              {/* Price */}
                              <Text fontWeight="700" fontSize="sm" color={isSelected ? 'brand.700' : 'gray.600'} flexShrink={0}>
                                {formatCurrencyLocal(service.price)}
                              </Text>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Center h="80px" bg="gray.50" borderRadius="xl">
                      <Text color="gray.400" fontSize="sm">No services configured yet.</Text>
                    </Center>
                  )}
                  <FormErrorMessage mt={2}>{errors.service_ids?.message}</FormErrorMessage>
                </FormControl>
              </Box>

              {/* --- Selection Summary Strip --- */}
              {selectedServiceIdsValue.length > 0 && (
                <Box bg="gray.50" px={4} py={3} borderRadius="xl">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      <Text as="span" fontWeight="700" color="gray.800">{selectedServiceIdsValue.length}</Text>
                      {' '}service{selectedServiceIdsValue.length !== 1 ? 's' : ''}
                    </Text>
                    <HStack spacing={3} divider={<Text color="gray.300" fontSize="xs">&middot;</Text>}>
                      <Text fontSize="sm" fontWeight="700" color="gray.700">{totalSelectedServiceDuration} min</Text>
                      <Text fontSize="sm" fontWeight="700" color="brand.600">{formatCurrencyLocal(totalSelectedPrice)}</Text>
                    </HStack>
                  </HStack>
                </Box>
              )}

            </VStack>
          </SlideFade>
        )}

        {/* ====== STEP 2: DATE & TIME ====== */}
        {currentStep === 2 && (
          <SlideFade in offsetY="16px">
            <VStack spacing={6} align="stretch">

              {/* --- Date Section --- */}
              <Box>
                <HStack spacing={2.5} mb={4}>
                  <Flex align="center" justify="center" w={8} h={8} borderRadius="xl" bg="orange.50">
                    <Icon as={CalendarDays} boxSize={4} color="orange.500" />
                  </Flex>
                  <Box>
                    <Heading as="h3" size="sm" fontWeight="700" color="gray.800" lineHeight="1.2">Pick a Date</Heading>
                    <Text fontSize="xs" color="gray.400">When should we schedule?</Text>
                  </Box>
                </HStack>

                <FormControl isInvalid={!!errors.selected_date}>
                  <Controller
                    name="selected_date"
                    control={control}
                    render={({ field }) => (
                      <Box borderRadius="2xl" overflow="hidden" bg="white" boxShadow="sm" borderWidth="1px" borderColor="gray.100" p={2}>
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
              </Box>

              {/* --- Time Section --- */}
              <Box>
                <HStack spacing={2.5} mb={3}>
                  <Flex align="center" justify="center" w={8} h={8} borderRadius="xl" bg="green.50">
                    <Icon as={Clock} boxSize={4} color="green.500" />
                  </Flex>
                  <Box>
                    <Heading as="h3" size="sm" fontWeight="700" color="gray.800" lineHeight="1.2">
                      {selectedDateValue ? format(selectedDateValue, 'EEEE, MMM d') : 'Pick a Time'}
                    </Heading>
                    <Text fontSize="xs" color="gray.400">
                      {availableTimes.length > 0 && !isLoadingTimes
                        ? `${availableTimes.length} slots available`
                        : 'Choose your preferred time'}
                    </Text>
                  </Box>
                </HStack>

                <FormControl isInvalid={!!errors.selected_time}>
                  {/* Quick Pick */}
                  {availableTimes.length > 0 && !isLoadingTimes && !availabilityError && (
                    <ChakraButton
                      onClick={handleNextAvailable}
                      w="full"
                      mb={4}
                      py={6}
                      variant="outline"
                      borderColor="brand.200"
                      bg="brand.50"
                      borderRadius="xl"
                      fontWeight="600"
                      fontSize="sm"
                      color="brand.700"
                      _hover={{ bg: 'brand.100', borderColor: 'brand.300' }}
                      leftIcon={<Icon as={Zap} boxSize={4} />}
                    >
                      Quick Pick &mdash; Next at {availableTimes[0]}
                    </ChakraButton>
                  )}

                  {/* Loading */}
                  {isLoadingTimes ? (
                    <Center h="120px">
                      <VStack spacing={3}>
                        <Spinner color="brand.500" size="lg" thickness="3px" />
                        <Text fontSize="sm" color="gray.400">Finding available times...</Text>
                      </VStack>
                    </Center>

                  /* Error */
                  ) : availabilityError ? (
                    <Box bg="orange.50" p={5} borderRadius="xl" textAlign="center">
                      <Text color="orange.600" fontSize="sm" fontWeight="500">{availabilityError}</Text>
                    </Box>

                  /* Time Period Sections */
                  ) : selectedDateValue && selectedServiceIdsValue.length > 0 && timePeriods.length > 0 ? (
                    <VStack spacing={5} align="stretch">
                      {timePeriods.map(period => (
                        <Box key={period.label}>
                          <HStack spacing={2} mb={3}>
                            <Icon as={period.icon} boxSize={4} color="gray.400" />
                            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.06em">
                              {period.label}
                            </Text>
                            <Badge bg="gray.100" color="gray.500" borderRadius="full" fontSize="2xs" px={2} fontWeight="600">
                              {period.times.length}
                            </Badge>
                          </HStack>
                          <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={2}>
                            {period.times.map(time => {
                              const isActive = selectedTimeValue === time;
                              return (
                                <ChakraButton
                                  key={time}
                                  h="44px"
                                  variant="unstyled"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  bg={isActive ? 'brand.500' : 'gray.50'}
                                  color={isActive ? 'white' : 'gray.700'}
                                  fontWeight={isActive ? '700' : '500'}
                                  fontSize="sm"
                                  borderRadius="xl"
                                  borderWidth="1.5px"
                                  borderColor={isActive ? 'brand.600' : 'transparent'}
                                  boxShadow={isActive ? 'md' : 'none'}
                                  _hover={{
                                    bg: isActive ? 'brand.600' : 'brand.50',
                                    borderColor: isActive ? 'brand.600' : 'brand.200',
                                    transform: 'scale(1.05)',
                                  }}
                                  transition="all 0.15s ease"
                                  onClick={() => !isSubmitting && setValue('selected_time', time, { shouldValidate: true })}
                                  isDisabled={isSubmitting}
                                >
                                  {time}
                                </ChakraButton>
                              );
                            })}
                          </SimpleGrid>
                        </Box>
                      ))}
                    </VStack>

                  /* Empty state */
                  ) : selectedDateValue && selectedServiceIdsValue.length > 0 && !isLoadingTimes ? (
                    <Box bg="gray.50" p={6} borderRadius="xl" textAlign="center">
                      <Text color="gray.400" fontSize="sm">No times available for this date. Try another.</Text>
                    </Box>
                  ) : null}

                  <FormErrorMessage>{errors.selected_time?.message}</FormErrorMessage>
                </FormControl>
              </Box>

              {/* --- Booking Summary Card --- */}
              {selectedTimeValue && totalSelectedServiceDuration > 0 && !isLoadingTimes && (
                <SlideFade in offsetY="10px">
                  <Box
                    bg="brand.50"
                    p={5}
                    borderRadius="2xl"
                    borderWidth="1px"
                    borderColor="brand.100"
                  >
                    <Text fontSize="xs" fontWeight="700" color="brand.600" textTransform="uppercase" letterSpacing="0.06em" mb={3}>
                      Booking Summary
                    </Text>
                    <VStack spacing={2.5} align="stretch">
                      <HStack spacing={3}>
                        <Icon as={User} boxSize={4} color="brand.400" />
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="600" color="brand.800" noOfLines={1}>{watch('client_name')}</Text>
                          <Text fontSize="xs" color="brand.500" noOfLines={1}>{watch('client_email')}</Text>
                        </Box>
                      </HStack>
                      <HStack spacing={3}>
                        <Icon as={Scissors} boxSize={4} color="brand.400" />
                        <Text fontSize="sm" color="brand.800" flex={1} noOfLines={1}>
                          {selectedServiceIdsValue.map(id => tenantServices.find(s => s.id === id)?.name).filter(Boolean).join(' + ')}
                        </Text>
                      </HStack>
                      <Divider borderColor="brand.100" />
                      <HStack justify="space-between">
                        <HStack spacing={3}>
                          <Icon as={CalendarDays} boxSize={4} color="brand.400" />
                          <Text fontSize="sm" fontWeight="700" color="brand.800">
                            {selectedDateValue && format(selectedDateValue, 'EEE, MMM d')}
                            {' \u00B7 '}
                            {selectedTimeValue} &ndash; {formatTimeFromMinutes(parseTimeToMinutes(selectedTimeValue) + totalSelectedServiceDuration)}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" fontWeight="700" color="brand.700">
                          {formatCurrencyLocal(totalSelectedPrice)}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </SlideFade>
              )}

            </VStack>
          </SlideFade>
        )}
      </form>
    </RightDrawerModal>
  );
};

export default CreateAppointmentModal;
