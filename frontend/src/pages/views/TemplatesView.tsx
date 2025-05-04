// src/pages/views/TemplatesView.tsx
// --- MODIFIED ---

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrashAlt, faToggleOn, faToggleOff, faSpinner, faExclamationTriangle, faCopy, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import axios from 'axios'; // Import axios for error checking helper

import {
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate // Import API functions
} from '../../api/templateApi';
import {
    TemplateOut, TEMPLATE_TRIGGER_LABELS, EMAIL_PLACEHOLDERS,
    TemplateCreatePayload, TemplateUpdatePayload // Import Types
} from '../../types/Template'; // Adjust path

// --- Import Actual Modals ---
import DeleteTemplateModal from '../../components/modals/DeleteTemplateModal'; // Adjust path
import CreateUpdateTemplateModal from '../../components/modals/CreateUpdateTemplateModal'; // Ensure this file exists or adjust the path

// Import shared styles
import '../../components/TableStyles.css';
import '../Dashboard.css';
import './TemplatesView.css';

// --- Utility function to extract error message (can be moved to a utils file) ---
const getErrorMessage = (err: any, defaultMessage: string): string => {
    console.error("API Error:", err); // Log the raw error
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') { errorMessage = detail; }
        else if (Array.isArray(detail) && detail[0]?.msg) { errorMessage = `${detail[0].loc.join(' -> ')}: ${detail[0].msg}`; }
        else { errorMessage = JSON.stringify(detail); }
    } else if (err instanceof Error) { errorMessage = err.message; }
    return errorMessage;
};


const TemplatesView: React.FC = () => {
    const [templates, setTemplates] = useState<TemplateOut[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); // Page-level error

    // Modal State
    const [isCreateUpdateModalOpen, setIsCreateUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateOut | null>(null);

    // --- Load Templates ---
    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null); // Clear page error on load
        try {
            const data = await fetchTemplates();
            setTemplates(data);
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to load templates."));
            setTemplates([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // --- Handlers for Modals ---
    const handleOpenCreateModal = () => {
        setSelectedTemplate(null);
        setIsCreateUpdateModalOpen(true);
    };

    const handleOpenEditModal = (template: TemplateOut) => {
        setSelectedTemplate(template);
        setIsCreateUpdateModalOpen(true);
    };

    const handleOpenDeleteModal = (template: TemplateOut) => {
        setSelectedTemplate(template);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsCreateUpdateModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedTemplate(null);
    };

    // --- Handler for Saving (Create or Update) ---
    const handleSaveTemplate = useCallback(async (
        templateId: number | null,
        data: TemplateCreatePayload | TemplateUpdatePayload
    ) => {
        setError(null); // Clear page error before save attempt
        console.log("Saving template...", { templateId, data });
        try {
            if (templateId) { // Editing existing template
                await updateTemplate(templateId, data as TemplateUpdatePayload);
            } else { // Creating new template
                await createTemplate(data as TemplateCreatePayload);
            }
            handleCloseModals();
            loadTemplates(); // Refresh list on success
        } catch (err: any) {
            console.error("Failed to save template:", err);
            // Re-throw error so modal can display it
            throw err;
        }
    }, [loadTemplates]); // Depend on loadTemplates

    // --- Handler for Deleting ---
    const handleDeleteTemplate = useCallback(async (templateId: number) => {
         setError(null);
         console.log("Deleting template...", templateId);
         try {
             await deleteTemplate(templateId);
             handleCloseModals();
             loadTemplates(); // Refresh list on success
         } catch (err: any) {
             console.error("Failed to delete template:", err);
             // Re-throw error so modal can display it
             throw err;
         }
    }, [loadTemplates]); // Depend on loadTemplates

    // --- Toggle Active Status ---
     const handleToggleActive = useCallback(async (template: TemplateOut) => {
         setError(null);
         const newStatus = !template.is_active;
         const originalTemplates = [...templates]; // Store original state for revert
         console.log(`Toggling active status for ${template.id} to ${newStatus}`);

         // Optimistic UI update
         setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_active: newStatus } : t));

         try {
             await updateTemplate(template.id, { is_active: newStatus });
             // Optional: call loadTemplates() here for server confirmation,
             // but optimistic update often feels faster. If loadTemplates() is called,
             // remove the setTemplates line above.
             // loadTemplates();
         } catch (err: any) {
             console.error("Failed to toggle template status", err);
             setError(getErrorMessage(err,"Failed to update template status."));
             // Revert optimistic update on error
             setTemplates(originalTemplates);
         }
     }, [templates]); // Depend on templates for revert


    // --- Copy Placeholder ---
    const copyPlaceholder = (placeholder: string) => {
         // NOTE: navigator.clipboard requires a secure context (HTTPS or localhost).
         // This may not work reliably during development using http://*.localtest.me
         // but is expected to work in production over HTTPS.
         navigator.clipboard.writeText(placeholder).catch(err => console.error('Copy failed: ', err));
         
     };

    // --- Render ---
    return (
        <div className="view-section templates-view">
             {/* Page Header */}
            <div className="view-header">
                <h1>Email Templates</h1>
                 <button className="button button-primary" onClick={handleOpenCreateModal}>
                    <FontAwesomeIcon icon={faPlus} /> Add New Template
                </button>
            </div>

            {/* Page-level Error Display */}
            {error && <div className="error-message alert alert-danger">{error}</div>}


             {/* Placeholders Info Section */}
            <div className="placeholders-info-section">
                 {/* ... Placeholder rendering ... */}
                <h3 data-tooltip-id="placeholder-tooltip">
                    Available Placeholders <FontAwesomeIcon icon={faInfoCircle} />
                </h3>
                <Tooltip id="placeholder-tooltip" place="top">
                    Click placeholder to copy. Use these in Subject and Body fields. They will be replaced with actual data when the email is sent.
                </Tooltip>
                <div className="placeholders-list">
                     {EMAIL_PLACEHOLDERS.map(p => (
                         <span key={p.placeholder} className="placeholder-tag" onClick={() => copyPlaceholder(p.placeholder)} title={`Click to copy: ${p.description}`}>
                            {p.placeholder} <FontAwesomeIcon icon={faCopy} size="xs"/>
                         </span>
                     ))}
                </div>
            </div>


            {/* Templates Table / List */}
            {isLoading ? (
                <div className="loading-message">Loading templates... <FontAwesomeIcon icon={faSpinner} spin /></div>
            ) : (
                <div className="table-container">
                    <table className="data-table templates-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Trigger Event</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.length > 0 ? templates.map(template => (
                                <tr key={template.id} className={!template.is_active ? 'inactive-row' : ''}>
                                    <td>{template.name}</td>
                                    <td>{TEMPLATE_TRIGGER_LABELS[template.event_trigger] || template.event_trigger}</td>
                                    <td>{template.email_subject || <span className="text-muted">- None -</span>}</td>
                                    <td>
                                        {/* Toggle Button */}
                                        <button
                                            className={`button-icon toggle-button ${template.is_active ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggleActive(template)}
                                            title={template.is_active ? 'Deactivate Template' : 'Activate Template'}
                                            // disabled={template.is_default_template} // Example: Prevent disabling defaults
                                        >
                                            <FontAwesomeIcon icon={template.is_active ? faToggleOn : faToggleOff} />
                                            {/* Optional Text: {template.is_active ? ' Active' : ' Inactive'} */}
                                        </button>
                                    </td>
                                    <td>
                                        {/* Action Buttons */}
                                        <div className="action-buttons">
                                            <button className="button button-secondary button-small" onClick={() => handleOpenEditModal(template)}>
                                                <FontAwesomeIcon icon={faEdit} /> Edit
                                            </button>
                                             {/* Prevent deleting defaults if needed */}
                                             {/* {!template.is_default_template && ( */}
                                                 <button className="button button-danger button-small" onClick={() => handleOpenDeleteModal(template)}>
                                                     <FontAwesomeIcon icon={faTrashAlt} /> Delete
                                                 </button>
                                             {/* )} */}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="no-data-message">
                                        No templates created yet. Click "Add New Template" to start.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Modals */}
             
             <CreateUpdateTemplateModal
                isOpen={isCreateUpdateModalOpen}
                onClose={handleCloseModals}
                template={selectedTemplate}
                onSave={handleSaveTemplate} 
             />
             
             <DeleteTemplateModal
                 isOpen={isDeleteModalOpen}
                 onClose={handleCloseModals}
                 template={selectedTemplate}
                 onConfirmDelete={handleDeleteTemplate} 
            />
        </div>
    );
};

export default TemplatesView;
