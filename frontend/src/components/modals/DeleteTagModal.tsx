// src/components/DeleteTagModal.tsx
// --- NEW FILE or Replace Skeleton ---

import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Your custom modal
import { FetchedTag } from '../../api/tagApi'; // Import type

interface DeleteTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>; // Parent handles API call and closing
    tag: FetchedTag | null; // The tag being deleted
}

const DeleteTagModal: React.FC<DeleteTagModalProps> = ({ isOpen, onClose, onConfirm, tag }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!tag) return; // Should not happen
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(tag.id);
            // onClose(); // Parent handles close
        } catch (err: any) {
            console.error("Delete tag submission error:", err);
            setError(err.response?.data?.detail || "Failed to delete tag.");
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
            <h2>Confirm Deletion</h2>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-confirmation-text">
                <p>Are you sure you want to permanently delete the tag:</p>
                <p>
                    <strong style={{ color: tag.color_hex || '#333' }}>
                        {tag.tag_name}
                    </strong>
                    ?
                </p>
                <p>(This will remove the tag from all clients it is currently assigned to. This action cannot be undone.)</p>
            </div>
            <div className="modal-actions">
                <button onClick={handleConfirm} disabled={isSubmitting} className="button button-danger">
                    {isSubmitting ? 'Deleting...' : 'Yes, Delete Tag'}
                </button>
                <button onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default DeleteTagModal;
