// src/components/DeleteClientModal.tsx
// --- NEW FILE ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Your custom Modal component
import { FetchedClient } from '../../api/clientApi';

interface DeleteClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>; // Parent handles API call and closing
    client: FetchedClient | null;
}

const DeleteClientModal: React.FC<DeleteClientModalProps> = ({ isOpen, onClose, onConfirm, client }) => {
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [error, setError] = useState<string | null>(null);

     // Reset error state when modal opens
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!client) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(client.id);
            // onClose(); // Let parent handle closing
        } catch (err: any) {
             console.error("Delete client submission error:", err);
             setError(err.response?.data?.detail || "Failed to delete client. Please try again.");
        } finally {
             setIsSubmitting(false);
        }
    };

    // Render nothing if the modal shouldn't be open or no client data
    if (!isOpen || !client) {
        return null;
    }

    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || `ID: ${client.id}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Confirm Deletion</h2>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-confirmation-text">
                <p>Are you sure you want to delete the client:</p>
                <p><strong>{clientName}</strong>?</p>
                <p>(This will mark the client as deleted but retain their record and appointment history).</p>
            </div>
            <div className="modal-actions">
                <button onClick={handleConfirm} disabled={isSubmitting} className="button button-danger">
                    {isSubmitting ? 'Deleting...' : 'Yes, Delete Client'}
                </button>
                <button onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default DeleteClientModal;
