// src/components/UpdateTagModal.tsx
// --- NEW FILE or Replace Skeleton ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Your custom modal
import { FetchedTag, TagUpdatePayload } from '../../api/tagApi'; // Import types

interface UpdateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: TagUpdatePayload) => Promise<void>; // Parent handles API
    tag: FetchedTag | null; // The tag being edited
}

const UpdateTagModal: React.FC<UpdateTagModalProps> = ({ isOpen, onClose, onSubmit, tag }) => {
    const [tagName, setTagName] = useState('');
    const [colorHex, setColorHex] = useState('#CCCCCC');
    const [iconId, setIconId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill form when a tag is selected and modal opens
    useEffect(() => {
        if (tag && isOpen) {
            setTagName(tag.tag_name);
            setColorHex(tag.color_hex || '#CCCCCC');
            setIconId(tag.icon_identifier || '');
            setError(null);
            setIsSubmitting(false);
        }
    }, [tag, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tag) return; // Should have a tag if modal is open
        setError(null);

        if (!tagName) {
            setError("Tag name cannot be empty.");
            return;
        }
        // Basic hex color validation (more robust validation in schema)
        if (colorHex && !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
             setError("Invalid hex color format (e.g., #RRGGBB).");
             return;
        }


        // Construct payload only with changed fields
        const payload: TagUpdatePayload = {};
        if (tagName !== tag.tag_name) payload.tag_name = tagName;
        if (colorHex !== (tag.color_hex || '#CCCCCC')) payload.color_hex = colorHex;
        if (iconId !== (tag.icon_identifier || '')) payload.icon_identifier = iconId;

        if (Object.keys(payload).length === 0) {
            setError("No changes detected.");
            return; // Or maybe just close the modal?
        }

        setIsSubmitting(true);
        try {
            await onSubmit(tag.id, payload);
            // onClose(); // Parent handles closing
        } catch (err: any) {
            console.error("Update tag submission error:", err);
            setError(err.response?.data?.detail || "Failed to update tag.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Don't render if not open or no tag
    if (!isOpen || !tag) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Update Tag (ID: {tag.id})</h2>
            {error && <p className="modal-error">{error}</p>}
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="update-tag-name">Tag Name:</label>
                    <input id="update-tag-name" type="text" value={tagName} onChange={e => setTagName(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="update-tag-color">Color:</label>
                    <input id="update-tag-color" type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className="form-input form-input-color" />
                     <span style={{ marginLeft: '10px', display: 'inline-block', width: '20px', height: '20px', backgroundColor: colorHex, border: '1px solid #ccc' }}></span>
                </div>
                <div className="form-group">
                    <label htmlFor="update-tag-icon">Icon Identifier (Optional):</label>
                    <input id="update-tag-icon" type="text" value={iconId} onChange={e => setIconId(e.target.value)} placeholder="e.g., fa-star" className="form-input" />
                </div>
                <div className="modal-actions">
                    <button type="submit" disabled={isSubmitting} className="button button-primary">{isSubmitting ? 'Updating...' : 'Update Tag'}</button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">Cancel</button>
                </div>
            </form>
        </Modal>
    );
};

export default UpdateTagModal;
