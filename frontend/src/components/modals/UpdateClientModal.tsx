// src/components/UpdateClientModal.tsx
// --- FULL REPLACEMENT ---

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { FetchedClient, ClientUpdatePayload, ClientTag } from '../../api/clientApi'; // Make sure ClientTag is defined/imported
import { FetchedTag } from '../../api/tagApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';



interface UpdateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: ClientUpdatePayload) => Promise<void>;
    client: FetchedClient | null;
    // --- Props for Tagging ---
    availableTags: FetchedTag[];
    onAssignTag: (clientId: number, tagId: number) => Promise<void>;
    onRemoveTag: (clientId: number, tagId: number) => Promise<void>;
    canAssignTags: boolean;
}

const UpdateClientModal: React.FC<UpdateClientModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    client,
    // --- Destructure new props ---
    availableTags,
    onAssignTag,
    onRemoveTag,
    canAssignTags,
}) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [birthday, setBirthday] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for Tag Management within Modal
    const [tagSearchTerm, setTagSearchTerm] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);
    const [assigningTagId, setAssigningTagId] = useState<number | null>(null);
    const [removingTagId, setRemovingTagId] = useState<number | null>(null);

    // Pre-fill form
    useEffect(() => {
        if (client && isOpen) {
            setFirstName(client.first_name || ''); setLastName(client.last_name || '');
            setEmail(client.email || ''); setPhone(client.phone_number || '');
            setNotes(client.notes || ''); setBirthday(client.birthday || '');
            setIsConfirmed(client.is_confirmed);
            // Reset tag & form state
            setTagSearchTerm(''); setTagError(null); setAssigningTagId(null); setRemovingTagId(null);
            setError(null); setIsSubmitting(false);
        }
    }, [client, isOpen]);

    // Filter available tags for the modal dropdown/list
    const filteredAvailableTagsForModal = useMemo(() => {
        if (!client) return [];
        const assignedTagIds = new Set(client.tags.map(t => t.id));
        return availableTags.filter(tag =>
            !assignedTagIds.has(tag.id) &&
            tag.tag_name.toLowerCase().includes(tagSearchTerm.toLowerCase())
        );
    }, [availableTags, client?.tags, tagSearchTerm]);

    // --- Handlers ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return;
        setError(null); setTagError(null); // Clear errors

        const payload: ClientUpdatePayload = {};
        if (firstName !== (client.first_name || '')) payload.first_name = firstName;
        if (lastName !== (client.last_name || '')) payload.last_name = lastName;
        if (email !== (client.email || '')) payload.email = email;
        if (phone !== (client.phone_number || '')) payload.phone_number = phone;
        if (notes !== (client.notes || '')) payload.notes = notes;
        if (birthday !== (client.birthday || '')) payload.birthday = birthday;
        if (isConfirmed !== client.is_confirmed) payload.is_confirmed = isConfirmed;

        // We submit core changes. Tag changes are handled instantly via onAssignTag/onRemoveTag.
        // If no core changes, we can just close or optionally still submit an empty payload if API allows.
        // if (Object.keys(payload).length === 0) {
        //     console.log("No core field changes in modal.");
        //     onClose(); // Just close if no core changes
        //     return;
        // }

        setIsSubmitting(true);
        try {
            await onSubmit(client.id, payload);
            onClose(); // Close modal on successful submission
        } catch (err: any) {
            console.error("Update client submission error:", err);
            setError(err.response?.data?.detail || "Failed to update client.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Instant Tag Handlers for Modal
    const handleModalAssignTag = async (tagId: number) => {
        if (!client || !canAssignTags) return;
        setAssigningTagId(tagId); setTagError(null);
        try {
            await onAssignTag(client.id, tagId); // Call handler passed from Dashboard
            setTagSearchTerm(''); // Clear search after successful assignment
        } catch(e) { setTagError("Failed to assign tag."); }
        finally { setAssigningTagId(null); }
    };

    const handleModalRemoveTag = async (tagId: number) => {
        if (!client || !canAssignTags) return;
        setRemovingTagId(tagId); setTagError(null);
        try {
            await onRemoveTag(client.id, tagId); // Call handler passed from Dashboard
        } catch(e) { setTagError("Failed to remove tag."); }
        finally { setRemovingTagId(null); }
    };


    // --- Render ---
    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Update Client (ID: {client.id})</h2>
            {error && <p className="modal-error">{error}</p>}
            {/* Use a single form for structure, but tag actions are instant */}
            <form onSubmit={handleSubmit} className="modal-form update-client-modal-form">

                {/* --- Core Client Fields --- */}
                <div className="form-row"> {/* Example using rows for layout */}
                    <div className="form-group half-width">
                        <label htmlFor={`update-client-fname-${client.id}`}>First Name:</label>
                        <input id={`update-client-fname-${client.id}`} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input"/>
                    </div>
                    <div className="form-group half-width">
                        <label htmlFor={`update-client-lname-${client.id}`}>Last Name:</label>
                        <input id={`update-client-lname-${client.id}`} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input"/>
                    </div>
                </div>
                 <div className="form-row">
                    <div className="form-group half-width">
                        <label htmlFor={`update-client-email-${client.id}`}>Email:</label>
                        <input id={`update-client-email-${client.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input"/>
                    </div>
                    <div className="form-group half-width">
                         <label htmlFor={`update-client-phone-${client.id}`}>Phone:</label>
                         <input id={`update-client-phone-${client.id}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input"/>
                    </div>
                 </div>
                 <div className="form-row">
                     <div className="form-group half-width">
                        <label htmlFor={`update-client-birthday-${client.id}`}>Birthday:</label>
                        <input id={`update-client-birthday-${client.id}`} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="form-input"/>
                     </div>
                     <div className="form-group half-width checkbox-group align-bottom"> {/* Align checkbox lower */}
                        <input id={`update-client-confirmed-${client.id}`} type="checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} className="form-checkbox"/>
                        <label htmlFor={`update-client-confirmed-${client.id}`}>Client Confirmed?</label>
                     </div>
                 </div>
                {/* Add Address Fields if needed */}
                <div className="form-group">
                    <label htmlFor={`update-client-notes-${client.id}`}>Notes:</label>
                    <textarea id={`update-client-notes-${client.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3}/>
                </div>

                {/* --- Tag Management Section --- */}
                {canAssignTags && (
                    <div className="form-section tags-management-section">
                        <h4>Tags</h4>
                        {tagError && <p className="modal-error tag-error">{tagError}</p>}
                        {/* Display Current Tags */}
                        <div className="current-tags-modal">
                            {client.tags?.length > 0 ? client.tags.map(tag => (
                                <span key={tag.id} className="tag assigned-tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>
                                    {tag.tag_name}
                                    <button type="button" onClick={() => handleModalRemoveTag(tag.id)} className="remove-tag-btn" disabled={removingTagId === tag.id} aria-label={`Remove tag ${tag.tag_name}`}>
                                        {removingTagId === tag.id ? <FontAwesomeIcon icon={faSpinner} spin size="xs"/> : <FontAwesomeIcon icon={faTimes} size="xs" />}
                                    </button>
                                </span>
                            )) : <span className="no-tags-assigned">No tags assigned.</span>}
                        </div>
                        {/* Add New Tags */}
                        <div className="add-tags-modal">
                            <label htmlFor={`tag-search-${client.id}`}>Assign New Tag:</label>
                            <input id={`tag-search-${client.id}`} type="text" placeholder="Search tags..." value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} className="tag-search-input"/>
                            <ul className="available-tags-list modal-available-tags">
                                {tagSearchTerm && filteredAvailableTagsForModal.length > 0 ? filteredAvailableTagsForModal.map(tag => (
                                    <li key={tag.id}>
                                        <button type="button" onClick={() => handleModalAssignTag(tag.id)} disabled={assigningTagId === tag.id} className="assign-tag-btn">
                                            <span className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>{tag.tag_name}</span>
                                             {assigningTagId === tag.id && <FontAwesomeIcon icon={faSpinner} spin size="xs"/>}
                                        </button>
                                    </li>
                                )) : ( tagSearchTerm && <li><i>No matching tags found.</i></li> )}
                            </ul>
                        </div>
                    </div>
                )}

                {/* --- Modal Actions --- */}
                <div className="modal-actions">
                    <button type="submit" disabled={isSubmitting} className="button button-primary">
                        {isSubmitting ? 'Saving...' : 'Save Client Changes'}
                    </button>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="button button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UpdateClientModal;
