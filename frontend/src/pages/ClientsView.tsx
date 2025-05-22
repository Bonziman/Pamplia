// src/pages/ClientsView.tsx
// --- REFACTORED ---

import React, { useState, useCallback } from 'react'; // Removed useEffect as data loading is in ClientsTable
import { useOutletContext } from 'react-router-dom';
import axios from 'axios'; // For error checking

// API Imports for MODALS (createClient, updateClient, deleteClient, assignClientTag, removeClientTag)
// fetchClients is no longer needed here as ClientsTable handles it.
import {
    createClient, updateClient, deleteClient, assignClientTag, removeClientTag,
    FetchedClient, ClientCreatePayload, ClientUpdatePayload
} from '../api/clientApi';
import { FetchedTag } from '../api/tagApi'; // Type for available tags

// Components
import ClientsTable from '../components/ClientsTable'; // This component now fetches its own data
import CreateClientModal from '../components/modals/CreateClientModal';
import UpdateClientModal from '../components/modals/UpdateClientModal';
import DeleteClientModal from '../components/modals/DeleteClientModal';

// Context type from Layout (Dashboard.tsx)
interface DashboardContext {
    availableTenantTags: FetchedTag[]; // Tags for modals and inline editor
    // loadingAvailableTags: boolean; // ClientsTable might not need this directly if tags are just for modals
    userProfile: any; // Replace 'any' with your UserProfile type
    // You might also pass down global error handlers or setError from Dashboard if needed
}

const ClientsView: React.FC = () => {
    const {
        availableTenantTags, // Use these for the UpdateClientModal and passed to ClientsTable for its inline editor
        userProfile
    } = useOutletContext<DashboardContext>();

    // State specific to this view (mostly for modals and global toggles like showDeletedClients)
    const [viewError, setViewError] = useState<string | null>(null); // Error specific to this view's operations (e.g., modal failures)
    const [showDeletedClients, setShowDeletedClients] = useState<boolean>(false);

    // Modal State
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
    const [isUpdateClientModalOpen, setIsUpdateClientModalOpen] = useState(false);
    const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
    const [selectedClientForModal, setSelectedClientForModal] = useState<FetchedClient | null>(null);

    // Permissions (derived from context or fetched profile)
    // const canManageClients = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff"; // ClientsTable can derive this from userProfile
    const canDeleteClients = userProfile?.role === "super_admin" || userProfile?.role === "admin";
    const canAssignClientTags = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";

    // Utility function to extract error message
    const getErrorMessage = (err: any, defaultMessage: string): string => {
        // ... (keep your existing getErrorMessage function)
        console.error("API Error:", err.response || err);
        let errorMessage = defaultMessage;
        if (axios.isAxiosError(err) && err.response?.data?.detail) {
            const detail = err.response.data.detail;
            if (typeof detail === 'string') { errorMessage = detail; }
            else if (Array.isArray(detail) && detail[0]?.msg) { errorMessage = `${detail[0].loc.join(' -> ')}: ${detail[0].msg}`; }
            else { errorMessage = JSON.stringify(detail); }
        } else if (err instanceof Error) { errorMessage = err.message; }
        return errorMessage;
    };

    // --- Modal Handlers ---
    // These handlers are for the modals managed by ClientsView.
    // After a successful operation, ClientsTable will automatically re-fetch
    // if its current filters/page might be affected (or on next interaction).
    // No need to manually call a loadClients here.

    const handleCreateClientSubmit = async (data: ClientCreatePayload) => {
        try {
            setViewError(null);
            await createClient(data);
            setIsCreateClientModalOpen(false);
            // ClientsTable will reflect the new client when its filters/pagination cause a re-fetch.
        } catch (err: any) {
            setViewError(getErrorMessage(err, "Failed to create client."));
            throw err; // Let modal handle its own internal loading/error state if needed
        }
    };

    const handleUpdateClientSubmit = async (id: number, data: ClientUpdatePayload) => {
        try {
            setViewError(null);
            await updateClient(id, data);
            setIsUpdateClientModalOpen(false);
            setSelectedClientForModal(null);
        } catch (err: any) {
            setViewError(getErrorMessage(err, "Failed to update client."));
            throw err;
        }
    };

    const handleDeleteClientConfirm = async (id: number) => {
        try {
            setViewError(null);
            await deleteClient(id);
            setIsDeleteClientModalOpen(false);
            setSelectedClientForModal(null);
        } catch (err: any) {
            setViewError(getErrorMessage(err, "Failed to delete client."));
            throw err;
        }
    };

    const handleOpenCreateClientModal = () => setIsCreateClientModalOpen(true);
    const handleOpenEditClientModal = (client: FetchedClient) => { setSelectedClientForModal(client); setIsUpdateClientModalOpen(true); };
    const handleOpenDeleteClientModal = (client: FetchedClient) => { setSelectedClientForModal(client); setIsDeleteClientModalOpen(true); };

    const handleToggleShowDeleted = () => {
        setShowDeletedClients(prev => !prev);
        // ClientsTable will pick up this prop change and re-fetch.
    };

    // Tag Handlers for UpdateClientModal (if it directly uses them)
    // Or, if UpdateClientModal uses an inline editor, these might not be needed here.
    // Your UpdateClientModal seems to take onAssignTag/onRemoveTag.
    // These should interact with the backend and then ClientsTable will update.
    const handleAssignTagForModal = async (clientId: number, tagId: number) => {
        try {
            setViewError(null);
            await assignClientTag(clientId, tagId);
            // Potentially refresh selectedClientForModal if it's being edited and needs to show new tag instantly in modal
            if (selectedClientForModal && selectedClientForModal.id === clientId) {
                // This is tricky as assignClientTag returns the full client.
                // Simplest: close modal and let table refresh. Or fetch client again for modal.
                // For now, rely on table refresh.
            }
        } catch (err: any) {
            setViewError(getErrorMessage(err, "Failed to assign tag."));
            throw err;
        }
    };

    const handleRemoveTagForModal = async (clientId: number, tagId: number) => {
        try {
            setViewError(null);
            await removeClientTag(clientId, tagId);
            // Similar to assign, update modal's client state or rely on table refresh.
        } catch (err: any) {
            setViewError(getErrorMessage(err, "Failed to remove tag."));
            throw err;
        }
    };


    return (
        <>
            {viewError && <div className="error-message view-error">Error: {viewError} <button onClick={() => setViewError(null)}>Dismiss</button></div>}

            <ClientsTable
                // Remove props that ClientsTable now manages internally:
                // clients={clients} // REMOVED
                // isLoading={loadingClients || loadingAvailableTags} // REMOVED

                // Pass necessary props:
                userProfile={userProfile}
                showDeletedClients={showDeletedClients} // For the checkbox and API param
                canDeleteClients={canDeleteClients}     // For action menu permission
                onToggleShowDeleted={handleToggleShowDeleted} // Handler for the checkbox

                // Modal Triggers (ClientsTable calls these when user clicks buttons in rows/header)
                onAddClient={handleOpenCreateClientModal}
                onEditClient={handleOpenEditClientModal}   // Renamed from handleClientRowEditClick for clarity
                onDeleteClient={handleOpenDeleteClientModal} // Renamed from handleClientRowDeleteClick

                // Tag related props for ClientsTable's *internal* InlineTagEditor
                // These `availableTags` are passed from Dashboard -> OutletContext -> Here -> ClientsTable
                availableTags={availableTenantTags} // For ClientsTable's inline editor
                onAssignTag={handleAssignTagForModal} // ClientsTable's inline editor will call this
                onRemoveTag={handleRemoveTagForModal} // ClientsTable's inline editor will call this
                canAssignTags={canAssignClientTags}
            />

            {/* Client Modals Rendered by this View */}
            <CreateClientModal
                isOpen={isCreateClientModalOpen}
                onClose={() => setIsCreateClientModalOpen(false)}
                onSubmit={handleCreateClientSubmit}
            />
            <UpdateClientModal
                isOpen={isUpdateClientModalOpen}
                onClose={() => { setIsUpdateClientModalOpen(false); setSelectedClientForModal(null); }}
                onSubmit={handleUpdateClientSubmit}
                client={selectedClientForModal}
                availableTags={availableTenantTags} // For the modal's own tag selection UI (if any)
                onAssignTag={handleAssignTagForModal} // For the modal's own tag assignment logic
                onRemoveTag={handleRemoveTagForModal} // For the modal's own tag removal logic
                canAssignTags={canAssignClientTags}
            />
            <DeleteClientModal
                isOpen={isDeleteClientModalOpen}
                onClose={() => { setIsDeleteClientModalOpen(false); setSelectedClientForModal(null); }}
                onConfirm={handleDeleteClientConfirm} // Changed from onSubmit to onConfirm for clarity
                client={selectedClientForModal}
            />
        </>
    );
};

export default ClientsView;
