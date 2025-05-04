// src/components/DeleteServiceModal.tsx (Using Custom Modal)
// --- MODIFIED ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Use your custom Modal component
import { FetchedService } from '../../api/serviceApi';

interface DeleteServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
    service: FetchedService | null;
}

const DeleteServiceModal: React.FC<DeleteServiceModalProps> = ({ isOpen, onClose, onConfirm, service }) => {
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [error, setError] = useState<string | null>(null);

    // Reset error when modal opens or service changes
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!service) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(service.id);
        } catch (err) {
             console.error("Delete error:", err);
             setError("Failed to delete service.");
        } finally {
             setIsSubmitting(false);
        }
    };

    if (!service) return null; // Don't render modal if no service selected

    return (
        // Use your custom Modal component
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Confirm Deletion</h2>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-confirmation-text"> {/* Add class for styling text */}
                <p>Are you sure you want to delete the service:</p>
                <p><strong>{service.name} (ID: {service.id})</strong>?</p>
                <p>This action cannot be undone.</p>
                {/* Optional: Add warning if service is used in appointments */}
            </div>
            <div className="modal-actions">
                <button onClick={handleConfirm} disabled={isSubmitting} className="button button-danger">
                    {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default DeleteServiceModal;
