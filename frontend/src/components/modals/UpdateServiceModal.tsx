// src/components/UpdateServiceModal.tsx (Using Custom Modal)
// --- MODIFIED ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Use your custom Modal component
import { FetchedService, ServiceUpdatePayload } from '../../api/serviceApi';

interface UpdateServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: ServiceUpdatePayload) => Promise<void>;
    service: FetchedService | null;
}

const UpdateServiceModal: React.FC<UpdateServiceModalProps> = ({ isOpen, onClose, onSubmit, service }) => {
    // State variables remain the same
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // useEffect and handleSubmit logic remain the same
    useEffect(() => {
        if (service && isOpen) {
            setName(service.name);
            setDescription(service.description || '');
            setDuration(service.duration_minutes);
            setPrice(service.price);
            setError(null);
            setIsSubmitting(false);
        }
    }, [service, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!service) return;
        setError(null);

        const payload: ServiceUpdatePayload = {};
        if (name !== service.name) payload.name = name;
        // Handle null vs empty string for description if needed
        if (description !== (service.description || '')) payload.description = description || undefined; // Send undefined if cleared
        if (duration !== '' && Number(duration) !== service.duration_minutes) payload.duration_minutes = Number(duration);
        if (price !== '' && Number(price) !== service.price) payload.price = Number(price);


        if (Object.keys(payload).length === 0) {
             setError("No changes detected.");
             return;
        }
         if (isNaN(Number(duration)) || isNaN(Number(price))) {
            setError("Duration and Price must be valid numbers.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(service.id, payload);
        } catch (err) {
             console.error("Update error:", err);
             setError("Failed to update service.");
        } finally {
             setIsSubmitting(false);
        }
    };


    if (!service) return null; // Don't render modal if no service selected

    return (
        // Use your custom Modal component
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Update Service (ID: {service.id})</h2>
             {error && <p className="modal-error">{error}</p>}
            <form onSubmit={handleSubmit} className="modal-form">
                 {/* Tenant ID Display (Readonly) */}
                <div className="form-group">
                    <label htmlFor="tenantId">Tenant ID:</label>
                    <input id="tenantId" type="number" value={service.tenant_id} readOnly disabled className="form-input"/>
                </div>
                {/* Other Form Fields */}
                 <div className="form-group">
                    <label htmlFor="serviceName">Name:</label>
                    <input id="serviceName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="serviceDescription">Description:</label>
                    <textarea id="serviceDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea"/>
                </div>
                <div className="form-group">
                    <label htmlFor="serviceDuration">Duration (minutes):</label>
                    <input id="serviceDuration" type="number" value={duration} onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))} className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="servicePrice">Price:</label>
                    <input id="servicePrice" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} className="form-input"/>
                </div>

                <div className="modal-actions">
                    <button type="submit" disabled={isSubmitting} className="button button-primary">
                        {isSubmitting ? 'Updating...' : 'Update Service'}
                    </button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UpdateServiceModal;
