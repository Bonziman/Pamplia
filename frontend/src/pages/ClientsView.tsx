// src/pages/ClientsView.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom'; // To get shared data like tags
import axios from 'axios'; // For error checking

// API Imports
import {
    fetchClients, createClient, updateClient, deleteClient, assignClientTag, removeClientTag,
    FetchedClient, ClientCreatePayload, ClientUpdatePayload
} from '../api/clientApi';
import { FetchedTag } from '../api/tagApi'; // Type for available tags

// Components
import ClientsTable from '../components/ClientsTable';
import CreateClientModal from '../components/modals/CreateClientModal';
import UpdateClientModal from '../components/modals/UpdateClientModal';
import DeleteClientModal from '../components/modals/DeleteClientModal';

// Context type from Layout
interface DashboardContext {
    availableTenantTags: FetchedTag[];
    loadingAvailableTags: boolean;
    userProfile: any; // Replace 'any' with your UserProfile type
}


const ClientsView: React.FC = () => {
    // Access shared data/context from DashboardLayout
    const { availableTenantTags, loadingAvailableTags, userProfile } = useOutletContext<DashboardContext>();

    // State specific to this view
    const [clients, setClients] = useState<FetchedClient[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeletedClients, setShowDeletedClients] = useState<boolean>(false);

    // Modal State
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
    const [isUpdateClientModalOpen, setIsUpdateClientModalOpen] = useState(false);
    const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<FetchedClient | null>(null);

    // Permissions (derived from context or fetched profile)
    const canManageClients = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
    const canDeleteClients = userProfile?.role === "super_admin" || userProfile?.role === "admin";
    const canAssignClientTags = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";

    // Utility function to extract error message
    const getErrorMessage = (err: any, defaultMessage: string): string => {
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


    // --- Data Fetching for this View ---
    const loadClients = useCallback((includeDeleted = showDeletedClients) => {
        if (!canManageClients) { setLoadingClients(false); return; }
        setLoadingClients(true); setError(null);
        fetchClients(includeDeleted)
            .then(setClients)
            .catch(err => { setError(getErrorMessage(err,"Could not load clients list.")); })
            .finally(() => setLoadingClients(false));
    }, [canManageClients, showDeletedClients]); // Dependency

    // Initial load and reload when filter changes
    useEffect(() => {
        loadClients();
    }, [loadClients]); // loadClients itself depends on showDeletedClients

    // --- Handlers ---
    const handleCreateClient = async (data: ClientCreatePayload) => {
        try { setError(null); await createClient(data); loadClients(); setIsCreateClientModalOpen(false); }
        catch(err: any) { setError(getErrorMessage(err, "Failed to create client.")); throw err; }
    };
    const handleUpdateClient = async (id: number, data: ClientUpdatePayload) => {
         try { setError(null); await updateClient(id, data); loadClients(); setIsUpdateClientModalOpen(false); setSelectedClient(null); }
        catch(err: any) { setError(getErrorMessage(err, "Failed to update client.")); throw err; }
    };
    const handleDeleteClient = async (id: number) => {
         try { setError(null); await deleteClient(id); loadClients(); setIsDeleteClientModalOpen(false); setSelectedClient(null); }
        catch(err: any) { setError(getErrorMessage(err, "Failed to delete client.")); throw err; }
    };
    const handleOpenCreateClientModal = () => { setIsCreateClientModalOpen(true); };
    const handleClientRowEditClick = (client: FetchedClient) => { setSelectedClient(client); setIsUpdateClientModalOpen(true); };
    const handleClientRowDeleteClick = (client: FetchedClient) => { setSelectedClient(client); setIsDeleteClientModalOpen(true); };
    const handleToggleShowDeleted = () => { setShowDeletedClients(prev => !prev); }; // State change triggers useEffect -> loadClients

    // Tag Handlers
    const handleAssignTag = async (clientId: number, tagId: number) => {
        try {
            setError(null);
            const updatedClient = await assignClientTag(clientId, tagId);
            setClients(prevClients => prevClients.map(c => c.id === clientId ? updatedClient : c));
        } catch (err: any) { setError(getErrorMessage(err, "Failed to assign tag.")); /* loadClients(); */ }
    };
    const handleRemoveTag = async (clientId: number, tagId: number) => {
        try {
            setError(null);
            await removeClientTag(clientId, tagId);
            setClients(prevClients => prevClients.map(c => c.id === clientId ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c));
        } catch (err: any) { setError(getErrorMessage(err, "Failed to remove tag.")); /* loadClients(); */ }
    };

    return (
        <>
            {error && <div className="error-message view-error">Error: {error}</div>}
            <ClientsTable
                clients={clients}
                isLoading={loadingClients || loadingAvailableTags} // Consider combined loading state
                userProfile={userProfile}
                showDeletedClients={showDeletedClients}
                canDeleteClients={canDeleteClients}
                onAddClient={handleOpenCreateClientModal}
                onEditClient={handleClientRowEditClick}
                onDeleteClient={handleClientRowDeleteClick}
                onToggleShowDeleted={handleToggleShowDeleted}
                availableTags={availableTenantTags}
                onAssignTag={handleAssignTag}
                onRemoveTag={handleRemoveTag}
                canAssignTags={canAssignClientTags}
            />

            {/* Client Modals Rendered by this View */}
             <CreateClientModal
                isOpen={isCreateClientModalOpen}
                onClose={() => setIsCreateClientModalOpen(false)}
                onSubmit={handleCreateClient}
            />
            <UpdateClientModal
                isOpen={isUpdateClientModalOpen}
                onClose={() => { setIsUpdateClientModalOpen(false); setSelectedClient(null); }}
                onSubmit={handleUpdateClient}
                client={selectedClient}
                availableTags={availableTenantTags} // Pass available tags
                onAssignTag={handleAssignTag}     // Pass assign handler
                onRemoveTag={handleRemoveTag}     // Pass remove handler
                canAssignTags={canAssignClientTags} // Pass permission
            />
            <DeleteClientModal
                isOpen={isDeleteClientModalOpen}
                onClose={() => { setIsDeleteClientModalOpen(false); setSelectedClient(null); }}
                onConfirm={handleDeleteClient}
                client={selectedClient}
            />
        </>
    );
};

export default ClientsView;
