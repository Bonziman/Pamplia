// src/components/CreateAppointmentModal.tsx
// --- FULL REPLACEMENT - COMPLETE CODE ---

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Keep calendar styles
import { format, startOfDay, parse, isValid } from 'date-fns';
import Modal from './Modal'; // YOUR Modal component path
import { PublicService, AppointmentCreatePayload } from '../../api/publicApi'; // Adjust path if needed
import './CreateAppointmentModal.css';

type CalendarValue = Date | null;
// Placeholder - This needs to be replaced with actual logic to fetch available times
// based on selected date, selected services (duration), tenant business hours, and existing appointments.
const DUMMY_TIMES: string[] = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

interface ClientPreInfo {
    name: string | null;
    email: string | null;
    phone: string | null;
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentCreatePayload) => Promise<void>; // Expects promise for error handling
  tenantServices: PublicService[];
  isLoadingServices: boolean;
  initialDate?: Date | null;
  initialError?: string | null;
  clientPreInfo?: ClientPreInfo; // Make optional
}

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tenantServices,
  isLoadingServices,
  initialDate,
  initialError,
  clientPreInfo
}) => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  // Replace DUMMY_TIMES with state fetched from backend
  const [availableTimes /*, setAvailableTimes */] = useState<string[]>(DUMMY_TIMES);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const areClientFieldsDisabled = clientPreInfo != null;

  useEffect(() => {
    if (isOpen) {
      const dateToSet = initialDate ? startOfDay(initialDate) : startOfDay(new Date());
      setSelectedDate(dateToSet);
      setClientName(clientPreInfo?.name ?? '');
      setClientEmail(clientPreInfo?.email ?? '');
      setClientPhone(clientPreInfo?.phone ?? '');
      setSelectedTime('');
      setSelectedServiceIds([]);
      setError(initialError || null);
      setIsSubmitting(false);
      // TODO: Implement fetchAvailableTimes(dateToSet, selectedServiceIds) here
      // console.log("Fetching times for:", dateToSet);
    }
  }, [isOpen, initialDate, initialError, clientPreInfo]);

  const handleServiceSelect = (serviceId: number) => {
    const newSelectedIds = selectedServiceIds.includes(serviceId)
        ? selectedServiceIds.filter(id => id !== serviceId)
        : [...selectedServiceIds, serviceId];
    setSelectedServiceIds(newSelectedIds);
    // TODO: Re-fetch available times if service selection affects duration/availability
    // if (selectedDate) {
    //   fetchAvailableTimes(selectedDate, newSelectedIds);
    // }
  };

  const handleDateChange = (value: unknown) => {
    const date = Array.isArray(value) ? value[0] : value;
    if (date instanceof Date) {
      const newSelectedDate = startOfDay(date);
      setSelectedDate(newSelectedDate);
      setSelectedTime(''); // Reset time when date changes
      setError(null);
      // TODO: Trigger availability fetch for the new date
      // fetchAvailableTimes(newSelectedDate, selectedServiceIds);
    }
  };

   const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setError(null); // Clear error when a valid time is selected
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0 || !clientName || !clientEmail) {
      setError("Please fill required fields (*), select service(s), date, and time.");
      return;
    }
    setIsSubmitting(true);

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const dateTimeString = `${dateString} ${selectedTime}`;
      const appointmentDateTime = parse(dateTimeString, 'yyyy-MM-dd HH:mm', new Date());

       if (!isValid(appointmentDateTime)) {
         throw new Error("Invalid date or time selected.");
       }
      // Convert to ISO 8601 format for the backend
      const appointmentIsoTime = appointmentDateTime.toISOString();

      const payload: AppointmentCreatePayload = {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || undefined, // Send undefined if empty
        appointment_time: appointmentIsoTime,
        service_ids: selectedServiceIds,
      };

      await onSubmit(payload); // Call parent's submit handler

    } catch (apiError: any) {
      console.error("Create failed in modal:", apiError);
       const message = apiError.response?.data?.detail || apiError.message || "Failed to create appointment.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Appointment"
    >
      <form onSubmit={handleSubmit} className="create-appointment-form">
        <div className="modal-form-columns">
          {/* ----- Left Column ----- */}
          <div className="modal-form-left-col">
            <h3 className="modal-section-title">Client Information</h3>
            <div className="booking-form-group">
              <label htmlFor="create_client_name">Client Name *</label>
              <input
                type="text" id="create_client_name" value={clientName}
                onChange={(e) => setClientName(e.target.value)} required
                disabled={isSubmitting || areClientFieldsDisabled}
                className={areClientFieldsDisabled ? 'input-disabled' : ''}
              />
            </div>
            <div className="booking-form-group">
              <label htmlFor="create_client_email">Client Email *</label>
              <input
                type="email" id="create_client_email" value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)} required
                disabled={isSubmitting || areClientFieldsDisabled}
                className={areClientFieldsDisabled ? 'input-disabled' : ''}
             />
            </div>
            <div className="booking-form-group">
              <label htmlFor="create_client_phone">Client Phone</label>
              <input
                type="tel" id="create_client_phone" value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                disabled={isSubmitting || areClientFieldsDisabled}
                className={areClientFieldsDisabled ? 'input-disabled' : ''}
              />
            </div>

            <h3 className="modal-section-title">Select Service(s) *</h3>
             {isLoadingServices ? <p>Loading services...</p> : tenantServices.length > 0 ? (
               <div className="service-list">
                 {tenantServices.map(service => (
                   <div
                      key={service.id}
                      className={`service-tag ${selectedServiceIds.includes(service.id) ? 'selected' : ''}`}
                      onClick={() => !isSubmitting && handleServiceSelect(service.id)}
                      role="checkbox"
                      aria-checked={selectedServiceIds.includes(service.id)}
                      tabIndex={isSubmitting ? -1 : 0} // Make untabbable when submitting
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isSubmitting && handleServiceSelect(service.id)}
                    >
                      {service.name}
                      <span className="details">{service.duration_minutes} mins • {service.price.toFixed(2)} MAD</span>
                    </div>
                 ))}
               </div>
             ) : ( <p className="no-items-message">No services available.</p> )}
          </div>

          {/* ----- Right Column ----- */}
          <div className="modal-form-right-col">
             <h3 className="modal-section-title">Select Date & Time *</h3>
             <div className="date-time-container">
                <div className="calendar-container">
                   <Calendar
                       onChange={handleDateChange}
                       value={selectedDate}
                       minDate={startOfDay(new Date())} // Prevent selecting past dates
                       className="appointment-calendar"
                       tileDisabled={({ date, view }) => view === 'month' && date < startOfDay(new Date())} // Visually disable past dates
                    />
                 </div>
                <div className="time-slots-container">
                   <label>Available Times</label>
                    {/* TODO: Replace with actual availability logic */}
                    {selectedDate ? ( // Only show times if a date is selected
                        availableTimes.length > 0 ? (
                           availableTimes.map(time => (
                               <button
                                   type="button"
                                   key={time}
                                   className={`time-slot-button ${selectedTime === time ? 'selected' : ''}`}
                                   onClick={() => !isSubmitting && handleTimeSelect(time)}
                                   disabled={isSubmitting} // Only disable based on submission state
                               >
                                   {time}
                               </button>
                           ))
                        ) : (
                           <p className="no-items-message">No available times for selected date.</p>
                        )
                    ) : (
                        <p className="no-items-message">Select a date first.</p>
                    )}
                 </div>
             </div>
          </div>
        </div> {/* End modal-form-columns */}

        {error && <p className="modal-form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="modal-button-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="modal-button-confirm" disabled={isSubmitting || isLoadingServices || selectedServiceIds.length === 0 || !selectedDate || !selectedTime || !clientName || !clientEmail}>
            {isSubmitting ? "Creating..." : "Create Appointment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAppointmentModal;
