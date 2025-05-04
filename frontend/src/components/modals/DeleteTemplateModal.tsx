// src/components/modals/DeleteTemplateModal.tsx
// --- NEW FILE ---

import React, { useState } from 'react';
import Modal from './Modal'; // Assuming Modal component exists at this path
import { TemplateOut } from '../../types/Template'; // Adjust path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faTimes, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface DeleteTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: (templateId: number) => Promise<void>; // Parent handles API call
    template: TemplateOut | null; // Template to be deleted
}

const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
    isOpen,
    onClose,
    onConfirmDelete,
    template,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!template) return;
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirmDelete(template.id);
            // onClose(); // Parent should close on successful delete via refresh/state change
        } catch (err: any) {
             const detail = err.response?.data?.detail || err.message || "Failed to delete template.";
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Reset error when modal is opened/closed or template changes
    React.useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsDeleting(false);
        }
    }, [isOpen]);

    if (!isOpen || !template) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion">
            <div className="delete-confirmation">
                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="warning-icon" />
                <h4>Delete Template?</h4>
                <p>
                    Are you sure you want to delete the template named{' '}
                    <strong>"{template.name}"</strong>?
                </p>
                <p>This action cannot be undone.</p>

                {error && <p className="modal-form-error">{error}</p>}

                <div className="modal-actions">
                    <button
                        type="button"
                        className="modal-button-cancel"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                         <FontAwesomeIcon icon={faTimes} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="modal-button-danger" // Use danger style
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</>
                        ) : (
                            <><FontAwesomeIcon icon={faTrashAlt} /> Delete Template</>
                        )}
                    </button>
                </div>
            </div>
             {/* Add some basic styling in a relevant CSS file if needed */}
             <style>{`
                .delete-confirmation { text-align: center; }
                .warning-icon { color: #dc3545; margin-bottom: 1rem; }
                .delete-confirmation h4 { margin-bottom: 0.5rem; }
                .delete-confirmation p { margin-bottom: 1rem; color: #495057; }
                .modal-form-error { color: #dc3545; margin-top: 1rem; }
             `}</style>
        </Modal>
    );
};

export default DeleteTemplateModal;
