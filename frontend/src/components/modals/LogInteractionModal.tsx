// src/components/modals/LogInteractionModal.tsx
// --- NEW FILE ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Adjust path
import {
    ManualLogCreatePayload, MANUAL_CHANNELS, MANUAL_DIRECTIONS, CommunicationChannel, CommunicationDirection
} from '../../types/Communication'; // Adjust path
import { FetchedAppointment } from '../../api/appointmentApi'; // Or from types/Appointment
import { fetchClientAppointments } from '../../api/clientApi'; // Fetch appts for dropdown
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
//import '../FormStyles.css'; // Use shared styles
import '../TableStyles.css';

interface LogInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: ManualLogCreatePayload) => Promise<void>; // Parent handles API call
    clientId: number | null; // Client context
}

// Initial form state
const getDefaultFormData = (clientId: number | null): Partial<ManualLogCreatePayload> => ({
    client_id: clientId ?? undefined, // Needs to be set
    channel: CommunicationChannel.PHONE, // Default channel
    direction: CommunicationDirection.OUTBOUND, // Default direction
    notes: '', // Required
    subject: '',
    appointment_id: undefined, // No default appointment
    timestamp: undefined, // Default to now on backend if undefined
});

const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    clientId,
}) => {
    const [formData, setFormData] = useState<Partial<ManualLogCreatePayload>>(getDefaultFormData(clientId));
    const [clientAppointments, setClientAppointments] = useState<FetchedAppointment[]>([]);
    const [isLoadingAppts, setIsLoadingAppts] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch client's appointments when modal opens (if clientId is available)
    useEffect(() => {
        if (isOpen && clientId) {
            setIsLoadingAppts(true);
            // Fetch upcoming or recent appointments? Fetch all for now.
            // NOTE: Consider adding pagination or date filter if list can be huge
            fetchClientAppointments(clientId) // Assumes this API exists
                .then(data => setClientAppointments(data)) // Directly set the array of appointments
                .catch(err => console.error("Failed to fetch client appointments for modal", err))
                .finally(() => setIsLoadingAppts(false));

            // Reset form when opening
            setFormData(getDefaultFormData(clientId));
            setError(null);
            setIsSaving(false);
        }
    }, [isOpen, clientId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? undefined : value, // Treat empty string as undefined for optional fields
        }));
        setError(null); // Clear error on input
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const { name, value } = e.target;
         setFormData(prev => ({
             ...prev,
             [name]: value,
         }));
         setError(null);
     };

     const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
         setFormData(prev => ({
            ...prev,
            // Convert empty string back to undefined for optional number ID
            [name]: value === "" ? undefined : parseInt(value, 10)
        }));
        setError(null);
     };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!clientId || !formData.channel || !formData.direction || !formData.notes) {
            setError("Please fill in all required fields (Channel, Direction, Notes).");
            return;
        }
        setIsSaving(true);
        setError(null);

        const payload: ManualLogCreatePayload = {
            client_id: clientId,
            channel: formData.channel as CommunicationChannel,
            direction: formData.direction as CommunicationDirection,
            notes: formData.notes,
            subject: formData.subject || undefined, // Ensure null/undefined if empty
            appointment_id: formData.appointment_id || undefined,
            timestamp: formData.timestamp || undefined, // Send if set, otherwise backend defaults
        };

        try {
            await onSave(payload);
            // onClose(); // Parent handles close on success
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || "Failed to save log entry.";
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            console.error("Save log failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || clientId === null) {
        return null; // Don't render if not open or no client context
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Manual Interaction">
            <form onSubmit={handleSubmit} className="log-interaction-form">

                {/* Channel Selection */}
                <div className="form-group">
                    <label>Channel *</label>
                    <div className="radio-group">
                        {MANUAL_CHANNELS.map(chan => (
                            <label key={chan.value} className="radio-label">
                                <input
                                    type="radio"
                                    name="channel"
                                    value={chan.value}
                                    checked={formData.channel === chan.value}
                                    onChange={handleRadioChange}
                                    required
                                    disabled={isSaving}
                                /> {chan.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Direction Selection */}
                <div className="form-group">
                     <label>Direction *</label>
                     <div className="radio-group">
                         {MANUAL_DIRECTIONS.map(dir => (
                             <label key={dir.value} className="radio-label">
                                 <input
                                    type="radio"
                                    name="direction"
                                    value={dir.value}
                                    checked={formData.direction === dir.value}
                                    onChange={handleRadioChange}
                                    required
                                    disabled={isSaving}
                                /> {dir.label}
                             </label>
                         ))}
                    </div>
                </div>

                {/* Date/Time */}
                <div className="form-group">
                     <label htmlFor="logTimestamp">Date & Time</label>
                     <input
                         type="datetime-local"
                         id="logTimestamp"
                         name="timestamp"
                         value={formData.timestamp || ''} // Controlled component needs string
                         onChange={handleInputChange}
                         className="form-input"
                         disabled={isSaving}
                     />
                     <small className="field-hint">Defaults to now if left blank. Allows backdating.</small>
                 </div>


                {/* Subject */}
                <div className="form-group">
                    <label htmlFor="logSubject">Subject / Summary</label>
                    <input
                        type="text" id="logSubject" name="subject"
                        value={formData.subject || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        disabled={isSaving}
                        maxLength={255}
                         placeholder="Optional summary (e.g., Call re: Reschedule)"
                    />
                </div>

                {/* Notes */}
                <div className="form-group">
                    <label htmlFor="logNotes">Notes *</label>
                    <textarea
                        id="logNotes" name="notes"
                        value={formData.notes || ''}
                        onChange={handleInputChange}
                        className="form-textarea"
                        required
                        disabled={isSaving}
                        rows={5}
                        placeholder="Enter details about the interaction..."
                    />
                </div>

                 {/* Associated Appointment */}
                 <div className="form-group">
                     <label htmlFor="logAppointment">Link to Appointment (Optional)</label>
                     <select
                        id="logAppointment" name="appointment_id"
                        value={formData.appointment_id || ''}
                        onChange={handleSelectChange} // Use specific handler for number conversion
                        className="form-select"
                        disabled={isSaving || isLoadingAppts}
                    >
                        <option value="">-- Select Appointment --</option>
                        {isLoadingAppts ? (
                            <option disabled>Loading appointments...</option>
                        ) : clientAppointments.length > 0 ? (
                             clientAppointments
                                // Optional: Sort by date?
                                .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
                                .map(appt => (
                                    <option key={appt.id} value={appt.id}>
                                        {new Date(appt.appointment_time).toLocaleDateString()} @ {new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.services?.map(s=>s.name).join(', ') || 'Service'})
                                    </option>
                                ))
                        ) : (
                            <option disabled>No appointments found for client</option>
                        )}
                     </select>
                 </div>

                {/* Error Display */}
                {error && <p className="modal-form-error">{error}</p>}

                {/* Actions */}
                <div className="modal-actions">
                    <button type="button" className="modal-button-cancel" onClick={onClose} disabled={isSaving}>
                         <FontAwesomeIcon icon={faTimes} /> Cancel
                    </button>
                    <button type="submit" className="modal-button-confirm" disabled={isSaving}>
                        {isSaving ? (
                             <><FontAwesomeIcon icon={faSpinner} spin /> Saving Log...</>
                        ) : (
                             <><FontAwesomeIcon icon={faSave} /> Save Log Entry</>
                        )}
                    </button>
                </div>
            </form>
             {/* Basic styles for radio groups */}
            <style>{`
                 .radio-group { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin-top: 0.25rem;}
                 .radio-label { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
                 .radio-label input[type="radio"] { margin-right: 0.1rem; cursor: pointer;}
            `}</style>
        </Modal>
    );
};

export default LogInteractionModal;
