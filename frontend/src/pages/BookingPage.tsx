// src/pages/BookingPage.tsx

import axios from "axios";
import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar'; // Ensure 'react-calendar' and '@types/react-calendar' are installed
import 'react-calendar/dist/Calendar.css';
import { format, startOfDay, parse } from 'date-fns';
import {
    fetchTenantServices,
    // fetchAvailableTimes, // Commented out as requested
    createPublicAppointment,
    PublicService,
    // TimeSlot, // Commented out as requested
    AppointmentCreatePayload
} from '../api/publicApi'; // Ensure path is correct
import './BookingPage.css'; // Ensure path is correct

// Calendar value type
type CalendarValue = Date | null;
// Dummy time slots if needed for UI testing without backend call
const DUMMY_TIMES: string[] = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"];

const BookingPage: React.FC = () => {
  // --- State ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // Store formatted time string (e.g., "HH:mm AM/PM")
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  // const [currentTenantId, setCurrentTenantId] = useState<number | null>(null); // Can get from services[0]?.tenant_id if needed
  const [availableTimes, setAvailableTimes] = useState<string[]>([]); // Keep state, populate with dummy/placeholder

  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false); // Keep false if not fetching
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // --- Fetch Services on Mount ---
  // No need for getSubdomain function here, fetchTenantServices uses window.location
  useEffect(() => {
    setIsLoadingServices(true);
    fetchTenantServices() // Call directly
      .then((fetchedServices: PublicService[]) => {
        setServices(fetchedServices);
        if (fetchedServices.length === 0) {
             setError("No services found for this booking portal.");
        }
        // If needed later for availability:
        // if (fetchedServices.length > 0) {
        //     setCurrentTenantId(fetchedServices[0].tenant_id);
        // }
      })
      .catch((apiError) => {
            // Check if it's an Axios error with a 404 specifically, or other error
            if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
                setError("Booking portal not found or invalid URL.");
            } else {
                setError("Could not load services. Please try refreshing.");
            }
            console.error("Service fetch error:", apiError); // Log full error
      })
      .finally(() => setIsLoadingServices(false));
  }, []); // Run only once on mount

  // --- Availability Effect (Placeholder) ---
  useEffect(() => {
    // If/when you implement availability fetching, put it here.
    // For now, we can populate with dummy data when a date is selected.
    if (selectedDate) {
        console.log("Setting dummy available times for selected date.");
        setAvailableTimes(DUMMY_TIMES); // Use dummy data
        setSelectedTime(null); // Reset selected time when date changes
        setIsLoadingTimes(false); // Not actually loading
    } else {
        setAvailableTimes([]); // Clear if no date selected
    }
  }, [selectedDate]); // Only depends on selectedDate for now

  // --- Handlers ---
  const handleDateChange = (value: Date | Date[]) => { // react-calendar v4 might pass Date[] for range
      // Handle single date selection
      const date = Array.isArray(value) ? value[0] : value;
      if (date) {
          setSelectedDate(startOfDay(date));
      }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleServiceSelect = (serviceId: number) => {
    setSelectedServiceIds(prevIds =>
      prevIds.includes(serviceId)
        ? prevIds.filter(id => id !== serviceId)
        : [...prevIds, serviceId]
    );
    // NOTE: Availability is NOT re-fetched based on service selection currently
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
        // Parse the selected time (e.g., "02:00 PM") back into HH:mm format if needed,
        // then combine with date and convert to ISO string.
        // This assumes selectedTime is directly usable or needs parsing.
        // Using date-fns parse might be more robust if format varies (e.g., AM/PM)
        let hours = 0;
        let minutes = 0;
        // Basic parsing assuming "HH:mm AM/PM" format from dummy data
        const timeMatch = selectedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if(timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
            const period = timeMatch[3]?.toUpperCase();
            if (period === "PM" && hours < 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0; // Midnight case
        } else {
             // Fallback or error if time format is unexpected (e.g. just "09:00")
             const timeParts = selectedTime.split(':');
             if(timeParts.length === 2) {
                 hours = parseInt(timeParts[0], 10);
                 minutes = parseInt(timeParts[1], 10);
             } else {
                  throw new Error("Invalid time format selected");
             }
        }


        const appointmentDateTime = new Date(selectedDate);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        if (isNaN(appointmentDateTime.getTime())) {
            throw new Error("Invalid date/time combination");
        }

        const appointmentIsoTime = appointmentDateTime.toISOString();

        const payload: AppointmentCreatePayload = {
            client_name: name,
            client_email: email,
            client_phone: phone || undefined,
            appointment_time: appointmentIsoTime,
            service_ids: selectedServiceIds,
        };

        await createPublicAppointment(payload);
        setSuccessMessage("Booking confirmed! You will receive details shortly.");
        // Reset form
        setName(''); setEmail(''); setPhone('');
        setSelectedDate(startOfDay(new Date()));
        setSelectedTime(null); setSelectedServiceIds([]); setAvailableTimes(DUMMY_TIMES); // Reset available times

    } catch (error: any) {
        setError(error.response?.data?.detail || "Booking failed. Please try again.");
        // --- FIX: Process Error Detail ---
      let errorMessage = "Booking failed. Please try again."; // Default
      if (axios.isAxiosError(error) && error.response?.data) {
          if (Array.isArray(error.response.data.detail)) {
              // Extract messages from Pydantic validation errors
              errorMessage = error.response.data.detail
                  .map((err: any) => `${err.loc?.slice(-1)[0] || 'Input'} - ${err.msg}`) // Show field name + message
                  .join('; ');
          } else if (typeof error.response.data.detail === 'string') {
              // Handle simple string detail messages
              errorMessage = error.response.data.detail;
          }
           // Optionally check for specific status codes like 400, 409 etc.
      }
    setError(errorMessage); // Set the processed string message
    // --- End Fix ---
  } finally {
    setIsSubmitting(false);
  }
};

  // --- Render ---
  if (isLoadingServices) {
    return <div className="loading-message">Loading services...</div>;
  }
  if (!isLoadingServices && error && services.length === 0) {
       // Display specific error if subdomain was invalid (or no services found)
       return <div className="booking-message error">{error || "No services available."}</div>;
  }
  if (services.length === 0) {
      // Handles case where fetch succeeded but returned empty
       return <div className="booking-message error">No services are currently available for booking.</div>;
  }


  const isSubmittable = selectedDate && selectedTime && selectedServiceIds.length > 0 && name && email;

  return (
    <div className="booking-page-container">
      <form onSubmit={handleSubmit}>

        {/* Personal Information */}
        <div className="booking-section">
          <h2>Your Information</h2>
          <div className="booking-form-group">
            <label htmlFor="name">Full Name *</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting}/>
          </div>
          <div className="booking-form-group">
            <label htmlFor="email">Email *</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting}/>
          </div>
          <div className="booking-form-group">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting}/>
          </div>
        </div>

        {/* Date Selection */}
        <div className="booking-section">
          <h2>Select Date *</h2>
          <Calendar
            // Ensure onChange type matches react-calendar version
            onChange={(value) => handleDateChange(value as Date)} // Simplified cast for single date
            value={selectedDate}
            minDate={startOfDay(new Date())} // Don't allow past dates
            className="react-calendar"
          />
        </div>

        {/* Time Selection (Using Dummy Data) */}
        {selectedDate && (
          <div className="booking-section">
            <h2>Select Time *</h2>
            {/* Removed isLoadingTimes check as we use dummy data */}
            {availableTimes.length > 0 ? (
              <div className="time-slots-container">
                {availableTimes.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`time-slot-button ${selectedTime === time ? 'selected' : ''}`}
                    onClick={() => handleTimeSelect(time)}
                    disabled={isSubmitting}
                  >
                    {time} {/* Display dummy time */}
                  </button>
                ))}
              </div>
            ) : (
              <p>Selected day is fully booked, try another day</p>
            )}
          </div>
        )}

        {/* Service Selection */}
        <div className="booking-section">
          <h2>Select Service(s) *</h2>
          <div className="service-list">
            {services.map(service => (
              <div
                key={service.id}
                className={`service-tag ${selectedServiceIds.includes(service.id) ? 'selected' : ''}`}
                onClick={() => !isSubmitting && handleServiceSelect(service.id)}
                role="checkbox"
                aria-checked={selectedServiceIds.includes(service.id)}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isSubmitting && handleServiceSelect(service.id)}
              >
                {service.name}
                <span className="details">{service.duration_minutes} mins • ${service.price}</span>
              </div>
            ))}
          </div>
        </div>

         {/* Display Error/Success Messages */}
        {error && <div className="booking-message error">{error}</div>}
        {successMessage && <div className="booking-message success">{successMessage}</div>}

        {/* Sticky Footer */}
        {!successMessage && (
            <div className="booking-footer">
                <button type="submit" className="booking-confirm-button" disabled={!isSubmittable || isSubmitting}>
                    {isSubmitting ? "Booking..." : "Confirm Booking"}
                </button>
            </div>
        )}
      </form>
    </div>
  );
};

export default BookingPage;
