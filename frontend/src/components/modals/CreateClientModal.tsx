// src/components/CreateClientModal.tsx
// --- NEW FILE ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Your custom Modal component
import { ClientCreatePayload } from '../../api/clientApi';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ClientCreatePayload) => Promise<void>; // Parent handles API call and closing
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    // Add other fields as needed (address, birthday)
    const [birthday, setBirthday] = useState(''); // Store as YYYY-MM-DD string

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setNotes('');
            setBirthday('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Basic Validation (add more as needed)
        if (!firstName && !lastName && !email && !phone) {
            setError("At least one identifier (Name, Email, or Phone) is required.");
            setIsSubmitting(false);
            return;
        }

        const payload: ClientCreatePayload = {
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            email: email || undefined,
            phone_number: phone || undefined,
            notes: notes || undefined,
            birthday: birthday || undefined,
            // Add address fields to payload if included in form
        };

        try {
            await onSubmit(payload);
            // onClose(); // Let parent handle closing on success
        } catch (err: any) {
            console.error("Create client submission error:", err);
            setError(err.response?.data?.detail || "Failed to create client. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Add New Client</h2>
            {error && <p className="modal-error">{error}</p>}
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="create-client-fname">First Name:</label>
                    <input id="create-client-fname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="create-client-lname">Last Name:</label>
                    <input id="create-client-lname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="create-client-email">Email:</label>
                    <input id="create-client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="create-client-phone">Phone:</label>
                    <input id="create-client-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="create-client-birthday">Birthday:</label>
                    <input id="create-client-birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="form-input"/>
                </div>
                {/* Add Address Fields if needed */}
                <div className="form-group">
                    <label htmlFor="create-client-notes">Notes:</label>
                    <textarea id="create-client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3}/>
                </div>

                <div className="modal-actions">
                    <button type="submit" disabled={isSubmitting} className="button button-primary">
                        {isSubmitting ? 'Creating...' : 'Create Client'}
                    </button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateClientModal;
