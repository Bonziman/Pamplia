// src/components/CreateServiceModal.tsx (Using Custom Modal)
// --- MODIFIED ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Use your custom Modal component
import { ServiceCreatePayload } from '../../api/serviceApi';
import { useAuth } from '../../auth/authContext';

interface CreateServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ServiceCreatePayload) => Promise<void>;
    userProfile: { role: string; tenant_id?: number | null; /* other fields */ };
}

// Remove react-modal specific setup:
// Modal.setAppElement('#root');

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({ isOpen, onClose, onSubmit, userProfile }) => {
    // State variables remain the same
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [tenantId, setTenantId] = useState<number | ''>(userProfile.role === 'admin' ? userProfile.tenant_id ?? '' : '');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // useEffect and handleSubmit logic remain the same
    useEffect(() => {
        if (isOpen) {
            setName('');
            setDescription('');
            setDuration('');
            setPrice('');
            setTenantId(userProfile.role === 'admin' ? userProfile.tenant_id ?? '' : '');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, userProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name || duration === '' || price === '') {
            setError("Name, Duration, and Price are required.");
            return;
        }
        if (isNaN(Number(duration)) || isNaN(Number(price))) {
            setError("Duration, and Price must be numbers.");
            return;
        }

        const payload: ServiceCreatePayload = {
            name,
            description: description || undefined,
            duration_minutes: Number(duration),
            price: Number(price),
            //tenant_id: Number(tenantId)
        };

        setIsSubmitting(true);
        try {
            await onSubmit(payload);
        } catch (err) {
            console.error("Submission error:", err);
            setError("Failed to create service. Please check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // Use your custom Modal component. Pass necessary props (isOpen, onClose).
        // Assume your Modal handles styling and accessibility internally.
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Create New Service</h2>
            {error && <p className="modal-error">{error}</p>} {/* Add specific class */}
            <form onSubmit={handleSubmit} className="modal-form"> {/* Add specific class */}
                
                {/* Other Form Fields */}
                <div className="form-group">
                    <label htmlFor="serviceName">Name:</label>
                    <input id="serviceName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="serviceDescription">Description:</label>
                    <textarea id="serviceDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea"/>
                </div>
                <div className="form-group">
                    <label htmlFor="serviceDuration">Duration (minutes):</label>
                    <input id="serviceDuration" type="number" value={duration} onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))} required className="form-input"/>
                </div>
                <div className="form-group">
                    <label htmlFor="servicePrice">Price:</label>
                    <input id="servicePrice" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required className="form-input"/>
                </div>

                <div className="modal-actions"> {/* Add class for styling buttons */}
                    <button type="submit" disabled={isSubmitting} className="button button-primary">
                        {isSubmitting ? 'Creating...' : 'Create Service'}
                    </button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateServiceModal;
