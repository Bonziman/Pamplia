// src/pages/Dashboard.tsx
// --- FULL REPLACEMENT ---

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios"; // Import axios for error checking

import { useAuth } from "../auth/authContext";

// --- API Imports (KEEP ones needed for remaining Dashboard features: Appts, Clients, Tags) ---
import {
    fetchAppointments,
    updateAppointment,
    deleteAppointment,
    FetchedAppointment,
    AppointmentUpdatePayload,
} from "../api/appointmentApi";
import {
    createPublicAppointment,
    fetchTenantServices,
    PublicService,
    AppointmentCreatePayload as PublicAppointmentCreatePayload
} from '../api/publicApi';
import {
   // fetchClients, // No longer called directly from Dashboard for the main list
    createClient,
    updateClient,
    deleteClient, // Soft delete
    assignClientTag,
    removeClientTag,
    FetchedClient,
    ClientCreatePayload,
    ClientUpdatePayload,
} from '../api/clientApi';
import {
    fetchTags,
    FetchedTag,
} from '../api/tagApi';

// --- Layout Components ---
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

// --- View Components & Modals ---
import DashboardOverviewPage from './DashboardOverviewPage'; // Import the new overview page
import AppointmentCalendar from '../components/AppointmentCalendar';
import ClientsTable from "../components/ClientsTable";
import TagManagementView from "../components/TagManagementView";
import ClientProfilePage from "./ClientProfilePage";
import StaffManagementView from "./views/StaffManagementView";
import ServicesView from "./views/ServicesView";
import TenantSettingsPage from "./TenantSettingsPage";

// Modals (KEEP ones needed for remaining Dashboard features: Appts, Clients)
import UpdateAppointmentModal from "../components/modals/UpdateAppointmentModal";
import DeleteAppointmentModal from "../components/modals/DeleteAppointmentModal";
import CreateAppointmentModal from "../components/modals/CreateAppointmentModal";
import CreateClientModal from "../components/modals/CreateClientModal";
import UpdateClientModal from "../components/modals/UpdateClientModal";
import DeleteClientModal from "../components/modals/DeleteClientModal";
// Service modals are now in ServicesView
// Tag Modals are rendered within TagManagementView

// --- Styles ---
import './Dashboard.css';
import '../components/TableStyles.css';
import TemplatesView from "./views/TemplatesView";

// --- Interfaces (KEEP ones needed for remaining Dashboard features) ---

// --- Dashboard Component ---
const Dashboard: React.FC = () => {
    const { isAuthenticated, userProfile, logout, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to get current path

    // --- State (KEEP only state NOT moved to views) ---
    const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
    const [publicTenantServices, setPublicTenantServices] = useState<PublicService[]>([]);
    const [clients, setClients] = useState<FetchedClient[]>([]);
    const [availableTenantTags, setAvailableTenantTags] = useState<FetchedTag[]>([]);

    // Loading State (KEEP only state NOT moved to views)
    const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
    const [loadingPublicServices, setLoadingPublicServices] = useState(false);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingAvailableTags, setLoadingAvailableTags] = useState<boolean>(false);

    // Modal State (KEEP only state NOT moved to views)
    const [isUpdateApptModalOpen, setIsUpdateApptModalOpen] = useState(false);
    const [isDeleteApptModalOpen, setIsDeleteApptModalOpen] = useState(false);
    const [isCreateApptModalOpen, setIsCreateApptModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<FetchedAppointment | null>(null);
    const [selectedDateForApptCreation, setSelectedDateForApptCreation] = useState<Date | null>(null);
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
    const [isUpdateClientModalOpen, setIsUpdateClientModalOpen] = useState(false);
    const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<FetchedClient | null>(null);

    // UI State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null); // Keep global error reporting possible
    const [showDeletedClients, setShowDeletedClients] = useState<boolean>(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

    // --- Permissions (Some can be derived within views, but keeping relevant ones here is fine) ---
    const canManageClients = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
    const canDeleteAppointments = userProfile?.role === "super_admin" || userProfile?.role === "admin";
    const canDeleteClients = userProfile?.role === "super_admin" || userProfile?.role === "admin";
    const canManageTagDefinitions = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
    const canAssignClientTags = userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
    // Permissions for settings views
    const isAdminOrSuper = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

    // --- Utility function to extract error message ---
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

    // --- Data Fetching Callbacks (KEEP only ones NOT moved) ---
    // NOTE: Appointments might be needed less often here if overview shows upcoming count
    // Consider only loading Appointments when navigating to '/calendar'
    const loadAppointments = useCallback(() => { setLoadingAppointments(true); setError(null); console.log("LoadAppointments: Fetching..."); fetchAppointments().then(data => { console.log("LoadAppointments: Success", data); setAppointments(data); }).catch(err => { console.error("LoadAppointments: Error", err); setError(getErrorMessage(err,"Could not load appointments.")); }).finally(() => setLoadingAppointments(false)); }, []);
    const loadPublicServices = useCallback(() => { setLoadingPublicServices(true); setError(null); console.log("LoadPublicServices: Fetching..."); fetchTenantServices().then(data => { console.log("LoadPublicServices: Success", data); setPublicTenantServices(data);}).catch(err => { console.error("LoadPublicServices: Error", err); setError(getErrorMessage(err,"Could not load available services.")); }).finally(() => setLoadingPublicServices(false)); }, []);
    //const loadClients = useCallback((includeDeleted = showDeletedClients) => { if (!canManageClients) { setLoadingClients(false); return; } setLoadingClients(true); setError(null); console.log("LoadClients: Fetching...", { includeDeleted }); fetchClients(includeDeleted).then(data => { console.log("LoadClients: Success", data); setClients(data); }).catch(err => { console.error("LoadClients: Error", err); setError(getErrorMessage(err,"Could not load clients list.")); }).finally(() => setLoadingClients(false)); }, [canManageClients, showDeletedClients]);
    const loadAvailableTags = useCallback(() => { if (!canAssignClientTags) { setLoadingAvailableTags(false); return; } setLoadingAvailableTags(true); setError(null); console.log("LoadAvailableTags: Fetching..."); fetchTags().then(data => { console.log("LoadAvailableTags: Success", data); setAvailableTenantTags(data); }).catch(err => { console.error("LoadAvailableTags: Error", err); setError(getErrorMessage(err, "Failed to load available tags")); }).finally(() => setLoadingAvailableTags(false)); }, [canAssignClientTags]);

    // --- Handlers (KEEP only handlers NOT moved) ---
    const handleLogout = () => { logout(); navigate('/login'); };
    const toggleSidebar = () => { setIsSidebarCollapsed(prev => !prev); };
    const handleNavigation = (path: string) => { setError(null); navigate(path); setIsSettingsMenuOpen(false); };
    const toggleSettingsMenu = () => { setIsSettingsMenuOpen(prev => !prev); };

    // -- Appointment Handlers --
    const handleUpdateAppointment = useCallback(async (id: number, data: AppointmentUpdatePayload) => { try { setError(null); await updateAppointment(id, data); loadAppointments(); setIsUpdateApptModalOpen(false); setSelectedAppointment(null); } catch (err: any) { setError(getErrorMessage(err, "Failed to update appointment.")); throw err; } }, [loadAppointments]);
    const handleDeleteAppointment = useCallback(async (id: number) => { try { setError(null); await deleteAppointment(id); loadAppointments(); setIsDeleteApptModalOpen(false); setSelectedAppointment(null); } catch (err: any) { setError(getErrorMessage(err, "Failed to delete appointment.")); throw err; } }, [loadAppointments]);
    const handleCreateAppointment = useCallback(async (data: PublicAppointmentCreatePayload) => { try { setError(null); await createPublicAppointment(data); loadAppointments(); setIsCreateApptModalOpen(false); setSelectedDateForApptCreation(null); } catch (err: any) { setError(getErrorMessage(err, "Failed to create appointment.")); throw err; } }, [loadAppointments]);
    const handleCalendarAppointmentClick = (appointment: FetchedAppointment) => { setSelectedAppointment(appointment); setIsUpdateApptModalOpen(true); };
    const handleCalendarDayClick = (date: Date) => { setSelectedDateForApptCreation(date); setIsCreateApptModalOpen(true); };

    // Add a handler to open the modal without a pre-selected date
    const handleOpenCreateAppointmentModal = () => {
        setSelectedDateForApptCreation(null); // Or new Date() if you want it to default to today
        setIsCreateApptModalOpen(true);
    };

    // -- Client Handlers --
    const handleCreateClient = useCallback(async (data: ClientCreatePayload) => {
        // This function is passed to CreateClientModal.
        // After successful creation, ClientsTable needs to refresh.
        try {
            setError(null);
            await createClient(data);
            // loadClients(); // REMOVED - ClientsTable will handle its own refresh
            setIsCreateClientModalOpen(false);
            // How to tell ClientsTable to refresh? -> It will manage its own data and filters.
            // A change in filters (like a new client appearing) means it should re-evaluate.
            // Or, we pass a refresh function from ClientsTable to its parent (Dashboard)
            // and then to the modal. This gets complex.
            // Simpler: CreateClientModal calls its onClose, and ClientsTable re-fetches if its filters might now include the new client.
            // For now, the manual filter changes in ClientsTable will trigger its own re-fetch.
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to create client."));
            throw err; // Let modal handle its own loading state/error display
        }
    }, []); // Removed loadClients dependency

    const handleUpdateClient = useCallback(async (id: number, data: ClientUpdatePayload) => {
        try {
            setError(null);
            await updateClient(id, data);
            // loadClients(); // REMOVED
            setIsUpdateClientModalOpen(false);
            setSelectedClient(null);
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to update client."));
            throw err;
        }
    }, []); // Removed loadClients dependency

    const handleDeleteClient = useCallback(async (id: number) => {
        try {
            setError(null);
            await deleteClient(id);
            // loadClients(); // REMOVED
            setIsDeleteClientModalOpen(false);
            setSelectedClient(null);
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to delete client."));
            throw err;
        }
    }, []); // Removed loadClients dependency

    const handleOpenCreateClientModal = () => { setIsCreateClientModalOpen(true); };
    const handleClientRowEditClick = (client: FetchedClient) => { setSelectedClient(client); setIsUpdateClientModalOpen(true); };
    const handleClientRowDeleteClick = (client: FetchedClient) => { setSelectedClient(client); setIsDeleteClientModalOpen(true); };
    const handleToggleShowDeleted = () => { setShowDeletedClients(prev => !prev); };

    // -- Client Tag Handlers --
    const handleAssignTag = useCallback(async (clientId: number, tagId: number) => {
        try {
            setError(null);
            await assignClientTag(clientId, tagId);
            // The updated client is returned by assignClientTag.
            // ClientsTable will need to refresh its data.
            // For now, this doesn't update any local state here.
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to assign tag."));
        }
    }, []);

    const handleRemoveTag = useCallback(async (clientId: number, tagId: number) => {
        try {
            setError(null);
            await removeClientTag(clientId, tagId);
            // ClientsTable will need to refresh its data.
        } catch (err: any) {
            setError(getErrorMessage(err, "Failed to remove tag."));
        }
    }, []);

    // --- Effects ---

    // Effect 1: Initial Auth Check & Core Data Load (Minimal: Public Services, Tags)
    useEffect(() => {
        if (!authIsLoading && !isAuthenticated) {
            console.log("Dashboard Initial Effect: Not authenticated, navigating to login.");
            navigate('/login');
        } else if (!authIsLoading && isAuthenticated && userProfile) {
            console.log("Dashboard Initial Effect: Authenticated. Loading core data (public services, tags).");
            // loadAppointments(); // Only load appointments when needed (e.g., navigating to calendar)
            loadPublicServices(); // Still needed for Create Appointment Modal
            loadAvailableTags(); // Still needed for Client Modals/Table
        }
    }, [authIsLoading, isAuthenticated, userProfile, navigate, loadPublicServices, loadAvailableTags]);


    // Effect 3: Load APPOINTMENTS Data when navigating to the calendar
     useEffect(() => {
        if (location.pathname.startsWith('/dashboard/calendar') && !authIsLoading && isAuthenticated) {
            console.log("Dashboard Calendar Effect: Triggering loadAppointments");
            loadAppointments();
        }
    }, [location.pathname, authIsLoading, isAuthenticated, loadAppointments]);


    // --- Render ---
    if (authIsLoading) return <div className="loading-message">Authenticating...</div>;
    if (!isAuthenticated || !userProfile) return null; // Should be redirected by effect

    console.log("--- Rendering Dashboard ---");
    // console.log("User:", userProfile?.email, "Role:", userProfile?.role); // Reduced logging

    // Determine active path for Sidebar highlighting more accurately
    const pathSegments = location.pathname.split('/').filter(Boolean); // e.g., ['dashboard', 'clients'] or ['dashboard', 'settings-tenant']
    const currentView = pathSegments[1] || 'overview'; // Default to overview if path is just '/dashboard'


    return (
        <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
                userRole={userProfile.role}
                tenantId={userProfile.tenant_id}
                activeView={currentView} // Use derived view for highlighting
                onNavigate={handleNavigation}
                isSettingsMenuOpen={isSettingsMenuOpen}
                toggleSettingsMenu={toggleSettingsMenu}
                onLogout={handleLogout}
            />
             <main className="main-content">
                <Header userName={userProfile.name ?? userProfile.email} onLogout={handleLogout} />

                {error && (
                    <div className="error-message global-error">
                        Error: {error}
                        <button onClick={() => setError(null)} style={{ marginLeft: '10px', cursor: 'pointer' }}>×</button>
                    </div>
                )}

                <Routes>
                    <Route index element={<DashboardOverviewPage 
                    userName={userProfile.name ?? userProfile.email}
                    onOpenCreateAppointmentModal={handleOpenCreateAppointmentModal} />} />
                    <Route path="calendar" element={
                        <div className="view-section">
                            <h2>Appointments Schedule</h2>
                            {loadingAppointments ? <div className="loading-message">Loading appointments...</div> : <AppointmentCalendar appointments={appointments} onAppointmentClick={handleCalendarAppointmentClick} onDayClick={handleCalendarDayClick} />}
                        </div>
                    } />

                    {/* Corrected ClientsTable invocation */}
                    <Route path="clients" element={
                        canManageClients ? (
                            <ClientsTable
                                userProfile={userProfile} // For role checks inside ClientsTable & action menu
                                showDeletedClients={showDeletedClients} // Global toggle from Dashboard
                                canDeleteClients={canDeleteClients} // For ActionMenu permission
                                onToggleShowDeleted={handleToggleShowDeleted} // Handler for the toggle

                                // Modal Triggers: ClientsTable calls these to open modals managed by Dashboard
                                onAddClient={handleOpenCreateClientModal}
                                onEditClient={handleClientRowEditClick}
                                onDeleteClient={handleClientRowDeleteClick}
                                
                                // Props for ClientsTable's *internal* InlineTagEditor:
                                availableTags={availableTenantTags} // All tags for the tenant
                                onAssignTag={handleAssignTag}       // Dashboard's function to call API
                                onRemoveTag={handleRemoveTag}       // Dashboard's function to call API
                                canAssignTags={canAssignClientTags} // Permission for inline editor
                            />
                        ) : <div className="permission-message">You do not have permission to manage clients.</div>
                    } />

                    <Route path="clients/:clientId" element={
                        canManageClients ? <ClientProfilePage /> : <div className="permission-message">You do not have permission to view client profiles.</div>
                    } />
                    <Route path="services" element={<ServicesView userProfile={userProfile} />} />
                    <Route path="users" element={<StaffManagementView />} />
                    <Route path="settings-tags" element={canManageTagDefinitions ? <TagManagementView /> : <Navigate to="/dashboard" replace />} />
                    <Route path="settings-business" element={isAdminOrSuper ? <TenantSettingsPage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="settings-templates" element={isAdminOrSuper ? <TemplatesView /> : <Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main> {/* End main-content */}

            {/* --- Modals --- */}
            {/* Appointment Modals (Could potentially be moved into Calendar view if complex) */}
            <UpdateAppointmentModal isOpen={isUpdateApptModalOpen} onClose={() => { setIsUpdateApptModalOpen(false); setSelectedAppointment(null); }} onSubmit={handleUpdateAppointment} appointment={selectedAppointment} />
            <DeleteAppointmentModal isOpen={isDeleteApptModalOpen} onClose={() => { setIsDeleteApptModalOpen(false); setSelectedAppointment(null); }} onConfirm={handleDeleteAppointment} appointment={selectedAppointment} />
            {/* Create Appt Modal might be triggered from multiple places (Calendar, Client Profile) so keep here? */}
            <CreateAppointmentModal isOpen={isCreateApptModalOpen} onClose={() => { setIsCreateApptModalOpen(false); setSelectedDateForApptCreation(null); }} onSubmit={handleCreateAppointment} tenantServices={publicTenantServices} isLoadingServices={loadingPublicServices} initialDate={selectedDateForApptCreation} />

            {/* Client Modals (Could potentially be moved into ClientsTable view) */}
            {canManageClients && userProfile && (
                <>
                    <CreateClientModal isOpen={isCreateClientModalOpen} onClose={() => setIsCreateClientModalOpen(false)} onSubmit={handleCreateClient} />
                    <UpdateClientModal
                        isOpen={isUpdateClientModalOpen}
                        onClose={() => { setIsUpdateClientModalOpen(false); setSelectedClient(null); }}
                        onSubmit={handleUpdateClient}
                        client={selectedClient}
                        availableTags={availableTenantTags}
                        onAssignTag={handleAssignTag}
                        onRemoveTag={handleRemoveTag}
                        canAssignTags={canAssignClientTags}
                    />
                    <DeleteClientModal isOpen={isDeleteClientModalOpen} onClose={() => { setIsDeleteClientModalOpen(false); setSelectedClient(null); }} onConfirm={handleDeleteClient} client={selectedClient} />
                </>
            )}

            {/* Service Modals are inside ServicesView */}
            {/* Tag Modals are inside TagManagementView */}

        </div> // End dashboard-layout
    );
};

export default Dashboard;
