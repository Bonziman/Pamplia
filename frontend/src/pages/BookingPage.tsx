// src/pages/BookingPage.tsx

import axios from "axios";
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { startOfDay } from 'date-fns';
import {
    Box, VStack, Heading, FormControl, FormLabel, Input, Button, Text,
    SimpleGrid, Alert, AlertIcon, Spinner, Center, Flex,
} from '@chakra-ui/react';
import {
    fetchTenantServices,
    createPublicAppointment,
    PublicService,
    AppointmentCreatePayload
} from '../api/publicApi';
import './BookingPage.css';

type CalendarValue = Date | null;
const DUMMY_TIMES: string[] = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"];

const BookingPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingServices(true);
    fetchTenantServices()
      .then((fetchedServices: PublicService[]) => {
        setServices(fetchedServices);
        if (fetchedServices.length === 0) setError("No services found for this booking portal.");
      })
      .catch((apiError) => {
        if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
          setError("Booking portal not found or invalid URL.");
        } else {
          setError("Could not load services. Please try refreshing.");
        }
      })
      .finally(() => setIsLoadingServices(false));
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setAvailableTimes(DUMMY_TIMES);
      setSelectedTime(null);
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate]);

  const handleDateChange = (value: Date | Date[]) => {
    const date = Array.isArray(value) ? value[0] : value;
    if (date) setSelectedDate(startOfDay(date));
  };

  const handleTimeSelect = (time: string) => setSelectedTime(time);

  const handleServiceSelect = (serviceId: number) => {
    setSelectedServiceIds(prevIds =>
      prevIds.includes(serviceId) ? prevIds.filter(id => id !== serviceId) : [...prevIds, serviceId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0 || !name || !email) {
      setError("Please select a date, time, at least one service, and provide your name and email.");
      return;
    }
    setIsSubmitting(true);
    try {
      let hours = 0, minutes = 0;
      const timeMatch = selectedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toUpperCase();
        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
      } else {
        const timeParts = selectedTime.split(':');
        if (timeParts.length === 2) { hours = parseInt(timeParts[0], 10); minutes = parseInt(timeParts[1], 10); }
        else throw new Error("Invalid time format selected");
      }
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      if (isNaN(appointmentDateTime.getTime())) throw new Error("Invalid date/time combination");

      const payload: AppointmentCreatePayload = {
        client_name: name, client_email: email, client_phone: phone || undefined,
        appointment_time: appointmentDateTime.toISOString(), service_ids: selectedServiceIds,
      };
      await createPublicAppointment(payload);
      setSuccessMessage("Booking confirmed! You will receive details shortly.");
      setName(''); setEmail(''); setPhone('');
      setSelectedDate(startOfDay(new Date())); setSelectedTime(null);
      setSelectedServiceIds([]); setAvailableTimes(DUMMY_TIMES);
    } catch (error: any) {
      let errorMessage = "Booking failed. Please try again.";
      if (axios.isAxiosError(error) && error.response?.data) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => `${err.loc?.slice(-1)[0] || 'Input'} - ${err.msg}`).join('; ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Loading ---
  if (isLoadingServices) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="lg" color="brand.500" thickness="3px" />
          <Text color="gray.500" fontSize="sm">Loading services...</Text>
        </VStack>
      </Center>
    );
  }

  if (!isLoadingServices && error && services.length === 0) {
    return (
      <Center py={20} px={6}>
        <Alert status="error" borderRadius="xl" maxW="480px">
          <AlertIcon /> {error || "No services available."}
        </Alert>
      </Center>
    );
  }

  if (services.length === 0) {
    return (
      <Center py={20} px={6}>
        <Alert status="info" borderRadius="xl" maxW="480px">
          <AlertIcon /> No services are currently available for booking.
        </Alert>
      </Center>
    );
  }

  const isSubmittable = selectedDate && selectedTime && selectedServiceIds.length > 0 && name && email;

  return (
    <Box maxW="560px" mx="auto" px={{ base: 5, md: 8 }} pt={{ base: 8, md: 12 }} pb="120px">
      <form onSubmit={handleSubmit}>

        {/* Personal Information */}
        <Box mb={8}>
          <Heading as="h2" size="md" fontWeight="700" color="gray.900" mb={4} letterSpacing="-0.025em">
            Your Information
          </Heading>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="0.8125rem" fontWeight="600" color="gray.700">Full Name</FormLabel>
              <Input
                value={name} onChange={e => setName(e.target.value)}
                borderRadius="xl" bg="gray.50" fontSize="0.9375rem"
                _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(13,148,136,0.1)' }}
                _placeholder={{ color: 'gray.400' }}
                isDisabled={isSubmitting}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="0.8125rem" fontWeight="600" color="gray.700">Email</FormLabel>
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                borderRadius="xl" bg="gray.50" fontSize="0.9375rem"
                _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(13,148,136,0.1)' }}
                _placeholder={{ color: 'gray.400' }}
                isDisabled={isSubmitting}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="0.8125rem" fontWeight="600" color="gray.700">Phone Number</FormLabel>
              <Input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                borderRadius="xl" bg="gray.50" fontSize="0.9375rem"
                _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(13,148,136,0.1)' }}
                _placeholder={{ color: 'gray.400' }}
                isDisabled={isSubmitting}
              />
            </FormControl>
          </VStack>
        </Box>

        {/* Date Selection */}
        <Box mb={8}>
          <Heading as="h2" size="md" fontWeight="700" color="gray.900" mb={4} letterSpacing="-0.025em">
            Select Date
          </Heading>
          <Calendar
            onChange={(value) => handleDateChange(value as Date)}
            value={selectedDate}
            minDate={startOfDay(new Date())}
            className="react-calendar"
          />
        </Box>

        {/* Time Selection */}
        {selectedDate && (
          <Box mb={8}>
            <Heading as="h2" size="md" fontWeight="700" color="gray.900" mb={4} letterSpacing="-0.025em">
              Select Time
            </Heading>
            {availableTimes.length > 0 ? (
              <SimpleGrid columns={{ base: 3, sm: 5 }} spacing={2}>
                {availableTimes.map(time => (
                  <Button
                    key={time} type="button" onClick={() => handleTimeSelect(time)}
                    variant={selectedTime === time ? 'solid' : 'outline'}
                    colorScheme={selectedTime === time ? 'brand' : 'gray'}
                    borderRadius="xl" fontWeight={selectedTime === time ? '700' : '500'}
                    fontSize="sm" h="42px"
                    borderColor={selectedTime === time ? 'brand.500' : 'gray.200'}
                    bg={selectedTime === time ? 'brand.500' : 'white'}
                    color={selectedTime === time ? 'white' : 'gray.700'}
                    _hover={{
                      bg: selectedTime === time ? 'brand.600' : 'gray.50',
                      borderColor: selectedTime === time ? 'brand.600' : 'gray.300',
                    }}
                    boxShadow={selectedTime === time ? '0 2px 8px rgba(13,148,136,0.25)' : 'none'}
                    isDisabled={isSubmitting}
                  >
                    {time}
                  </Button>
                ))}
              </SimpleGrid>
            ) : (
              <Text color="gray.500" fontSize="sm">Selected day is fully booked, try another day</Text>
            )}
          </Box>
        )}

        {/* Service Selection */}
        <Box mb={8}>
          <Heading as="h2" size="md" fontWeight="700" color="gray.900" mb={4} letterSpacing="-0.025em">
            Select Service(s)
          </Heading>
          <Flex flexWrap="wrap" gap={3}>
            {services.map(service => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <Box
                  key={service.id}
                  px={5} py={3}
                  borderWidth="1px"
                  borderColor={isSelected ? 'brand.500' : 'gray.200'}
                  borderRadius="14px"
                  bg={isSelected ? 'brand.500' : 'white'}
                  color={isSelected ? 'white' : 'gray.700'}
                  cursor={isSubmitting ? 'not-allowed' : 'pointer'}
                  fontWeight={isSelected ? '600' : '400'}
                  boxShadow={isSelected ? '0 2px 8px rgba(13,148,136,0.2)' : 'none'}
                  transition="all 0.2s ease"
                  userSelect="none"
                  _hover={{
                    borderColor: isSelected ? 'brand.600' : 'brand.500',
                    bg: isSelected ? 'brand.600' : 'brand.50',
                  }}
                  onClick={() => !isSubmitting && handleServiceSelect(service.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isSubmitting && handleServiceSelect(service.id)}
                >
                  <Text fontSize="sm" fontWeight="600">{service.name}</Text>
                  <Text fontSize="xs" mt={1} color={isSelected ? 'whiteAlpha.800' : 'gray.400'} fontWeight="500">
                    {service.duration_minutes} mins &bull; ${service.price}
                  </Text>
                </Box>
              );
            })}
          </Flex>
        </Box>

        {/* Messages */}
        {error && (
          <Alert status="error" borderRadius="xl" mb={5} fontSize="sm">
            <AlertIcon /> {error}
          </Alert>
        )}
        {successMessage && (
          <Alert status="success" borderRadius="xl" mb={5} fontSize="sm">
            <AlertIcon /> {successMessage}
          </Alert>
        )}

        {/* Sticky Footer */}
        {!successMessage && (
          <Box
            position="fixed" bottom={0} left={0} w="100%"
            bg="rgba(255,255,255,0.9)" backdropFilter="blur(20px)"
            py={4} px={5}
            boxShadow="0 -1px 0 rgba(0,0,0,0.05)"
            zIndex={100}
          >
            <Button
              type="submit" w="100%" maxW="560px" mx="auto" display="block"
              h="52px" fontSize="md" fontWeight="700"
              colorScheme="brand" borderRadius="14px"
              isDisabled={!isSubmittable || isSubmitting}
              isLoading={isSubmitting} loadingText="Booking..."
              letterSpacing="-0.01em"
              _hover={{ transform: 'translateY(-1px)', boxShadow: '0 4px 16px rgba(13,148,136,0.3)' }}
              _active={{ transform: 'translateY(0)' }}
              _disabled={{ bg: 'gray.200', color: 'gray.400', cursor: 'not-allowed', transform: 'none', boxShadow: 'none' }}
            >
              Confirm Booking
            </Button>
          </Box>
        )}
      </form>
    </Box>
  );
};

export default BookingPage;
