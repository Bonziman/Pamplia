// src/components/UpdateAppointmentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal'; // Assuming Modal.tsx is in the same folder or adjust path
import { FetchedAppointment, AppointmentUpdatePayload } from '../../api/appointmentApi'; // Adjust path
import { formatForDateTimeLocalInput } from '../../utils/formatDate'; // Adjust path
import { AppointmentStatus } from '../../types/enums'; // Assuming you have this frontend enum or use strings

// Define possible statuses for the dropdown
const appointmentStatuses = Object.values(AppointmentStatus); // Get values from enum

interface UpdateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: AppointmentUpdatePayload) => Promise<void>; // Make onSubmit async
    appointment: FetchedAppointment | null; // The appointment being edited
}

const UpdateAppointmentModal: React.FC<UpdateAppointmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    appointment
}) => {
    const [formData, setFormData] = useState<AppointmentUpdatePayload>({});
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill form when appointment prop changes (modal opens)
    useEffect(() => {
        if (appointment) {
            const formattedTime = formatForDateTimeLocalInput(appointment.appointment_time);
            setFormData({
                client_name: appointment.client_name,
                client_email: appointment.client_email,
                appointment_time: formattedTime,
                status: appointment.status,
            });
            setError(null); // Clear previous errors
        } else {
             setFormData({}); // Clear form if no appointment
        }
    }, [appointment]); // Re-run when the appointment object changes

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!appointment) return;

        setError(null);
        setIsSubmitting(true);
        try {
            // Convert time back to ISO if needed by backend
            const payload: AppointmentUpdatePayload = {
                ...formData,
                appointment_time: formData.appointment_time
                                    ? new Date(formData.appointment_time).toISOString()
                                    : undefined
            };
            await onSubmit(appointment.id, payload); // Call the onSubmit prop passed from Dashboard
            // onClose(); // Let the parent component handle closing on success if needed
        } catch (apiError: any) {
             console.error("Update failed in modal:", apiError);
             // Extract error message more robustly if needed
             setError(apiError.response?.data?.detail || "Failed to update appointment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Update Appointment #${appointment?.id}`}
        >
            {appointment && (
                <form onSubmit={handleSubmit} className="modal-form">
                    <div>
                        <label htmlFor="update_client_name">Client Name</label>
                        <input type="text" id="update_client_name" name="client_name" value={formData.client_name || ''} onChange={handleChange} disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="update_client_email">Client Email</label>
                        <input type="email" id="update_client_email" name="client_email" value={formData.client_email || ''} onChange={handleChange} disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="update_appointment_time">Appointment Time</label>
                        <input type="datetime-local" id="update_appointment_time" name="appointment_time" value={formData.appointment_time || ''} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="update_status">Status</label>
                        <select id="update_status" name="status" value={formData.status || ''} onChange={handleChange} required disabled={isSubmitting}>
                            {appointmentStatuses.map(statusValue => (
                                <option key={statusValue} value={statusValue}>
                                    {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-button-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="modal-button-confirm" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default UpdateAppointmentModal;
