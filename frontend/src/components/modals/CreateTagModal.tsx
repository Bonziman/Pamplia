// src/components/CreateTagModal.tsx (Example Skeleton)
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { TagCreatePayload } from '../../api/tagApi';

interface CreateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TagCreatePayload) => Promise<void>;
}

const CreateTagModal: React.FC<CreateTagModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [tagName, setTagName] = useState('');
    const [colorHex, setColorHex] = useState('#CCCCCC'); // Default color
    const [iconId, setIconId] = useState(''); // Optional icon
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTagName('');
            setColorHex('#CCCCCC');
            setIconId('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!tagName) {
            setError("Tag name is required.");
            return;
        }
        setIsSubmitting(true);
        const payload: TagCreatePayload = {
            tag_name: tagName,
            color_hex: colorHex || undefined, // Send default or user choice
            icon_identifier: iconId || undefined
        };
        try {
            await onSubmit(payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create tag.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Create New Tag</h2>
            {error && <p className="modal-error">{error}</p>}
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="tag-name">Tag Name:</label>
                    <input id="tag-name" type="text" value={tagName} onChange={e => setTagName(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="tag-color">Color:</label>
                    <input id="tag-color" type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className="form-input form-input-color" />
                    <span style={{ marginLeft: '10px', display: 'inline-block', width: '20px', height: '20px', backgroundColor: colorHex, border: '1px solid #ccc' }}></span>
                </div>
                <div className="form-group">
                    <label htmlFor="tag-icon">Icon Identifier (Optional):</label>
                    <input id="tag-icon" type="text" value={iconId} onChange={e => setIconId(e.target.value)} placeholder="e.g., fa-star" className="form-input" />
                </div>
                <div className="modal-actions">
                    <button type="submit" disabled={isSubmitting} className="button button-primary">{isSubmitting ? 'Creating...' : 'Create Tag'}</button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">Cancel</button>
                </div>
            </form>
        </Modal>
    );
};
export default CreateTagModal;
