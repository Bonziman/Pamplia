// src/components/modals/CreateUpdateTemplateModal.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal'; // Adjust path
import {
    TemplateOut, TemplateCreatePayload, TemplateUpdatePayload,
    TemplateEventTrigger, TemplateType, TEMPLATE_TRIGGER_LABELS, EMAIL_PLACEHOLDERS
} from '../../types/Template'; // Adjust path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner, faCopy, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip'; // Assuming usage
import '../SwitchToggle.css'; // Import toggle styles if needed
//import '../../FormStyles.css';  Adjusted path for common form styles

interface CreateUpdateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templateId: number | null, data: TemplateCreatePayload | TemplateUpdatePayload) => Promise<void>; // Parent handles API call
    template?: TemplateOut | null; // If present, we are editing
    
}

// Default state for creating
const defaultFormData: TemplateCreatePayload = {
    name: '',
    type: TemplateType.EMAIL,
    event_trigger: TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT, // Sensible default
    email_subject: '',
    email_body: '',
    is_active: true,
};

const CreateUpdateTemplateModal: React.FC<CreateUpdateTemplateModalProps> = ({
    isOpen,
    onClose,
    onSave,
    template,
}) => {
    const isEditing = !!template;
    const [formData, setFormData] = useState<TemplateCreatePayload | TemplateUpdatePayload>(defaultFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Populate form when template prop changes (for editing) or modal opens
    useEffect(() => {
        if (isOpen) {
            if (isEditing && template) {
                // Populate with existing data for editing
                setFormData({
                    name: template.name,
                    // Don't allow changing type/trigger when editing usually
                    // type: template.type,
                    // event_trigger: template.event_trigger,
                    email_subject: template.email_subject || '',
                    email_body: template.email_body,
                    is_active: template.is_active,
                });
            } else {
                // Reset to defaults for creating
                setFormData(defaultFormData);
            }
            setError(null); // Clear errors when opening
            setIsSaving(false);
        }
    }, [isOpen, isEditing, template]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';

        setFormData(prev => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
        }));
        setError(null); // Clear error on input
    };

     const copyPlaceholder = (placeholder: string) => {
         navigator.clipboard.writeText(placeholder).catch(err => console.error('Copy failed: ', err));
     };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const payload = { ...formData };
             // Clean up fields not needed for update if necessary (backend might ignore them anyway)
             if(isEditing) {
                 delete (payload as Partial<TemplateCreatePayload>).type;
                 delete (payload as Partial<TemplateCreatePayload>).event_trigger;
             }

            await onSave(template?.id ?? null, payload);
            // onClose(); // Let parent handle close on success via state update/refresh
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || `Failed to ${isEditing ? 'update' : 'create'} template.`;
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    // Get trigger options for the dropdown (only needed for create)
    const triggerOptions = Object.entries(TEMPLATE_TRIGGER_LABELS) as [TemplateEventTrigger, string][];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Template" : "Create New Template"}>
            <form onSubmit={handleSubmit} className="template-form">

                {/* Placeholders Info */}
                <div className="placeholders-info-section modal-placeholders">
                    <h4 data-tooltip-id="modal-placeholder-tooltip">
                         Available Placeholders <FontAwesomeIcon icon={faInfoCircle} size="sm"/>
                    </h4>
                     <Tooltip id="modal-placeholder-tooltip" place="top">
                        Click placeholder to copy. Use these in Subject and Body.
                    </Tooltip>
                     <div className="placeholders-list">
                         {EMAIL_PLACEHOLDERS.map(p => (
                             <span key={p.placeholder} className="placeholder-tag" onClick={() => copyPlaceholder(p.placeholder)} title={`Click to copy: ${p.description}`}>
                                {p.placeholder} <FontAwesomeIcon icon={faCopy} size="xs"/>
                             </span>
                         ))}
                    </div>
                </div>


                {/* Form Fields */}
                <div className="form-group">
                    <label htmlFor="templateName">Template Name *</label>
                    <input
                        type="text" id="templateName" name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                        disabled={isSaving}
                    />
                     <small className="field-hint">A descriptive name (e.g., "Client Reminder Email").</small>
                </div>

                <div className="form-group">
                    <label htmlFor="eventTrigger">Trigger Event *</label>
                    <select
                        id="eventTrigger" name="event_trigger"
                        value={!isEditing ? (formData as TemplateCreatePayload).event_trigger : template?.event_trigger} // Show existing value if editing
                        onChange={handleInputChange}
                        className="form-select"
                        required
                        disabled={isSaving || isEditing} // Disable when editing - trigger shouldn't change
                    >
                        {triggerOptions.map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                     {isEditing && <small className="field-hint">Trigger event cannot be changed after creation.</small>}
                </div>

                <div className="form-group">
                    <label htmlFor="emailSubject">Email Subject</label>
                    <input
                        type="text" id="emailSubject" name="email_subject"
                        value={formData.email_subject || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        disabled={isSaving}
                        placeholder="e.g., Your Appointment Reminder for {{appointment_date}}"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="emailBody">Email Body *</label>
                    <textarea
                        id="emailBody" name="email_body"
                        value={formData.email_body || ''}
                        onChange={handleInputChange}
                        className="form-textarea"
                        required
                        disabled={isSaving}
                        rows={10} // Provide ample space
                        placeholder="Enter email content here. Use placeholders like {{client_name}}..."
                    />
                </div>

                <div className="form-group toggle-group">
                     <label className="switch-toggle">
                         <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active ?? true} // Default to true if undefined
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                         <span className="slider round"></span>
                     </label>
                     <span className="toggle-label">Active</span>
                      <small className="field-hint">Inactive templates will not be sent.</small>
                </div>


                {/* Error Display */}
                {error && <p className="modal-form-error">{error}</p>}

                {/* Actions */}
                <div className="modal-actions">
                    <button
                        type="button"
                        className="modal-button-cancel"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                         <FontAwesomeIcon icon={faTimes} /> Cancel
                    </button>
                    <button
                        type="submit"
                        className="modal-button-confirm"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                             <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</>
                        ) : (
                             <><FontAwesomeIcon icon={faSave} /> {isEditing ? 'Save Changes' : 'Create Template'}</>
                        )}
                    </button>
                </div>
            </form>
             {/* Optional: Add some specific modal form styles */}
            <style>{`
                 .template-form .modal-placeholders { margin-bottom: 1.5rem; padding: 0.8rem 1rem; font-size: 0.9em;}
                 .template-form .modal-placeholders h4 { font-size: 1rem; margin-bottom: 0.5rem; }
                 .template-form .form-textarea { font-family: inherit; }
                 .toggle-group { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.5rem;}
                 .toggle-label { font-weight: 500; }
            `}</style>
        </Modal>
    );
};

export default CreateUpdateTemplateModal;
