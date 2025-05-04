// src/components/DeleteAppointmentModal.tsx
import React, { useState } from 'react';
import Modal from './Modal'; // Adjust path if needed
import { FetchedAppointment } from '../../api/appointmentApi'; // Adjust path
import { formatReadableDateTime } from '../../utils/formatDate'; // Adjust path

interface DeleteAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>; // Make onConfirm async
    appointment: FetchedAppointment | null;
}

const DeleteAppointmentModal: React.FC<DeleteAppointmentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    appointment
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!appointment) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await onConfirm(appointment.id); // Call the onConfirm prop
            // onClose(); // Let parent handle closing
        } catch (apiError: any) {
             console.error("Delete failed in modal:", apiError);
             setError(apiError.response?.data?.detail || "Failed to delete appointment.");
        } finally {
            setIsSubmitting(false);
        }
    };

     // Clear error when closing
     const handleClose = () => {
        setError(null);
        setIsSubmitting(false); // Reset submitting state
        onClose();
     }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose} // Use internal handler to clear state
            title={`Confirm Deletion`}
        >
            {appointment && (
                <div>
                    <p>Are you sure you want to delete the appointment for <strong>{appointment.client_name}</strong> at {formatReadableDateTime(appointment.appointment_time)}?</p>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-button-cancel" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
                        <button type="button" className="modal-button-delete" onClick={handleConfirm} disabled={isSubmitting}>
                            {isSubmitting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DeleteAppointmentModal;
