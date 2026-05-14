import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  CloseButton,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { useAuth } from "../auth/authContext";
import {
  AppointmentUpdatePayload,
  deleteAppointment,
  fetchAppointments,
  FetchedAppointment,
  updateAppointment,
} from "../api/appointmentApi";
import { fetchManagedServices, FetchedService } from "../api/serviceApi";
import {
  assignClientTag,
  ClientCreatePayload,
  ClientUpdatePayload,
  createClient,
  deleteClient,
  FetchedClient,
  removeClientTag,
  updateClient,
} from "../api/clientApi";
import { fetchTags, FetchedTag } from "../api/tagApi";

import DashboardLayout from "../layouts/DashboardLayout";
import DashboardOverviewPage from "./DashboardOverviewPage";
import AppointmentCalendar from "../components/AppointmentCalendar";
import ClientsTable from "../components/ClientsTable";
import TagManagementView from "../components/TagManagementView";
import ClientProfilePage from "./ClientProfilePage";
import StaffManagementView from "./views/StaffManagementView";
import ServicesView from "./views/ServicesView";
import TenantSettingsPage from "./TenantSettingsPage";
import TenantsManagementView from "./views/TenantsManagementView";
import SuperAdminUsersView from "./views/SuperAdminUsersView";
import TemplatesView from "./views/TemplatesView";

import UpdateAppointmentModal from "../components/modals/UpdateAppointmentModal";
import DeleteAppointmentModal from "../components/modals/DeleteAppointmentModal";
import CreateAppointmentModal from "../components/modals/CreateAppointmentModal";
import CreateClientModal from "../components/modals/CreateClientModal";
import UpdateClientModal from "../components/modals/UpdateClientModal";
import DeleteClientModal from "../components/modals/DeleteClientModal";

import "../components/TableStyles.css";
import { useLanguage } from "../i18n/languageContext";

const getErrorMessage = (err: any, fallback: string): string => {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      return `${detail[0].loc.join(" -> ")}: ${detail[0].msg}`;
    }
    return JSON.stringify(detail);
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

const DashboardRefactored: React.FC = () => {
  const { language } = useLanguage();
  const isFr = language === "fr";
  const tx = useCallback((en: string, fr: string) => (isFr ? fr : en), [isFr]);

  const { isAuthenticated, userProfile, logout, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [publicTenantServices, setPublicTenantServices] = useState<FetchedService[]>([]);
  const [availableTenantTags, setAvailableTenantTags] = useState<FetchedTag[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingPublicServices, setLoadingPublicServices] = useState(false);
  const [loadingAvailableTags, setLoadingAvailableTags] = useState(false);

  const [isUpdateApptModalOpen, setIsUpdateApptModalOpen] = useState(false);
  const [isDeleteApptModalOpen, setIsDeleteApptModalOpen] = useState(false);
  const [isCreateApptModalOpen, setIsCreateApptModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<FetchedAppointment | null>(null);
  const [selectedDateForApptCreation, setSelectedDateForApptCreation] = useState<Date | null>(null);

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isUpdateClientModalOpen, setIsUpdateClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<FetchedClient | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [showDeletedClients, setShowDeletedClients] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [dashboardOverviewRefreshCallback, setDashboardOverviewRefreshCallback] = useState<(() => void) | null>(null);

  const isSuperAdmin = userProfile?.role === "super_admin";
  const isAdminOrSuper = userProfile?.role === "admin" || userProfile?.role === "super_admin";
  const canManageClients =
    userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
  const canDeleteClients = userProfile?.role === "super_admin" || userProfile?.role === "admin";
  const canManageTagDefinitions =
    userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";
  const canAssignClientTags =
    userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.role === "staff";

  const currentView = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    return pathSegments[1] || "overview";
  }, [location.pathname]);

  const loadAppointments = useCallback(() => {
    setLoadingAppointments(true);
    setError(null);
    fetchAppointments()
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch((err) => setError(getErrorMessage(err, tx("Could not load appointments.", "Impossible de charger les rendez-vous."))))
      .finally(() => setLoadingAppointments(false));
  }, [tx]);

  const loadPublicServices = useCallback(() => {
    setLoadingPublicServices(true);
    setError(null);
    fetchManagedServices()
      .then((data) => setPublicTenantServices(data))
      .catch((err) => setError(getErrorMessage(err, tx("Could not load available services.", "Impossible de charger les services disponibles."))))
      .finally(() => setLoadingPublicServices(false));
  }, [tx]);

  const loadAvailableTags = useCallback(() => {
    if (!canAssignClientTags) {
      setLoadingAvailableTags(false);
      return;
    }

    setLoadingAvailableTags(true);
    setError(null);
    fetchTags()
      .then((data) => setAvailableTenantTags(data))
      .catch((err) => setError(getErrorMessage(err, tx("Failed to load available tags.", "Echec du chargement des tags disponibles."))))
      .finally(() => setLoadingAvailableTags(false));
  }, [canAssignClientTags, tx]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleNavigation = useCallback(
    (path: string) => {
      setError(null);
      navigate(path);
      setIsSettingsMenuOpen(false);
    },
    [navigate]
  );

  const toggleSettingsMenu = useCallback(() => {
    setIsSettingsMenuOpen((prev: boolean) => !prev);
  }, []);

  const handleUpdateAppointment = useCallback(
    async (id: number, data: AppointmentUpdatePayload) => {
      try {
        setError(null);
        await updateAppointment(id, data);
        loadAppointments();
        setIsUpdateApptModalOpen(false);
        setSelectedAppointment(null);
      } catch (err: unknown) {
        const message = getErrorMessage(err, tx("Failed to update appointment.", "Echec de mise a jour du rendez-vous."));
        setError(message);
        throw err;
      }
    },
    [loadAppointments, tx]
  );

  const handleDeleteAppointment = useCallback(
    async (id: number) => {
      try {
        setError(null);
        await deleteAppointment(id);
        loadAppointments();
        setIsDeleteApptModalOpen(false);
        setSelectedAppointment(null);
      } catch (err: unknown) {
        const message = getErrorMessage(err, tx("Failed to delete appointment.", "Echec de suppression du rendez-vous."));
        setError(message);
        throw err;
      }
    },
    [loadAppointments, tx]
  );

  const handleCalendarAppointmentClick = useCallback((appointment: FetchedAppointment) => {
    setSelectedAppointment(appointment);
    setIsUpdateApptModalOpen(true);
  }, []);

  const handleCalendarDayClick = useCallback((date: Date) => {
    setSelectedDateForApptCreation(date);
    setIsCreateApptModalOpen(true);
  }, []);

  const handleOpenCreateAppointmentModal = useCallback((onCreated?: () => void) => {
    setSelectedDateForApptCreation(null);
    setDashboardOverviewRefreshCallback(() => onCreated || null);
    setIsCreateApptModalOpen(true);
  }, []);

  const handleCreateClient = useCallback(async (data: ClientCreatePayload) => {
    try {
      setError(null);
      await createClient(data);
      setIsCreateClientModalOpen(false);
    } catch (err: unknown) {
      const message = getErrorMessage(err, tx("Failed to create client.", "Echec de creation du client."));
      setError(message);
      throw err;
    }
  }, [tx]);

  const handleUpdateClient = useCallback(async (id: number, data: ClientUpdatePayload) => {
    try {
      setError(null);
      await updateClient(id, data);
      setIsUpdateClientModalOpen(false);
      setSelectedClient(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, tx("Failed to update client.", "Echec de mise a jour du client."));
      setError(message);
      throw err;
    }
  }, [tx]);

  const handleDeleteClient = useCallback(async (id: number) => {
    try {
      setError(null);
      await deleteClient(id);
      setIsDeleteClientModalOpen(false);
      setSelectedClient(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, tx("Failed to delete client.", "Echec de suppression du client."));
      setError(message);
      throw err;
    }
  }, [tx]);

  const handleAssignTag = useCallback(async (clientId: number, tagId: number) => {
    try {
      setError(null);
      await assignClientTag(clientId, tagId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, tx("Failed to assign tag.", "Echec de l'attribution du tag.")));
    }
  }, [tx]);

  const handleRemoveTag = useCallback(async (clientId: number, tagId: number) => {
    try {
      setError(null);
      await removeClientTag(clientId, tagId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, tx("Failed to remove tag.", "Echec de suppression du tag.")));
    }
  }, [tx]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!authIsLoading && isAuthenticated && userProfile) {
      loadPublicServices();
      loadAvailableTags();
    }
  }, [
    authIsLoading,
    isAuthenticated,
    userProfile,
    navigate,
    loadPublicServices,
    loadAvailableTags,
  ]);

  useEffect(() => {
    const shouldLoadAppointments =
      location.pathname === "/dashboard" ||
      location.pathname === "/dashboard/" ||
      location.pathname.startsWith("/dashboard/calendar");

    if (shouldLoadAppointments && !authIsLoading && isAuthenticated) {
      loadAppointments();
    }
  }, [location.pathname, authIsLoading, isAuthenticated, loadAppointments]);

  const handleCreateAppointmentSuccess = useCallback(() => {
    loadAppointments();
    dashboardOverviewRefreshCallback?.();
  }, [dashboardOverviewRefreshCallback, loadAppointments]);

  const renderCalendarRoute = () => {
    if (isSuperAdmin) return <Navigate to="/dashboard/tenants" replace />;

    return (
      <Box>
        <Heading size="md" mb={4}>
          {tx("Appointment Calendar", "Planning des rendez-vous")}
        </Heading>
        {loadingAppointments ? (
          <Flex
            bg="white"
            borderWidth="1px"
            borderColor="gray.100"
            borderRadius="2xl"
            boxShadow="sm"
            px={6}
            py={12}
            align="center"
            justify="center"
            gap={3}
          >
            <Spinner size="sm" color="brand.500" />
            <Text fontSize="sm" color="gray.600">
              {tx("Loading appointments...", "Chargement des rendez-vous...")}
            </Text>
          </Flex>
        ) : (
          <AppointmentCalendar
            appointments={appointments}
            onAppointmentClick={handleCalendarAppointmentClick}
            onDayClick={handleCalendarDayClick}
          />
        )}
      </Box>
    );
  };

  if (authIsLoading) return <div className="loading-message">{tx("Authenticating...", "Authentification...")}</div>;
  if (!isAuthenticated || !userProfile) return null;

  return (
    <DashboardLayout
      userName={userProfile.name ?? userProfile.email}
      userRole={userProfile.role}
      activeView={currentView}
      onNavigate={handleNavigation}
      onLogout={handleLogout}
      isSettingsMenuOpen={isSettingsMenuOpen}
      toggleSettingsMenu={toggleSettingsMenu}
      tenantId={userProfile.tenant_id}
    >
      {error && (
        <Alert status="error" borderRadius="xl" mb={4} variant="subtle">
          <AlertIcon />
          <AlertDescription flex="1" fontSize="sm">
            {error}
          </AlertDescription>
          <CloseButton size="sm" onClick={() => setError(null)} />
        </Alert>
      )}

      <Routes>
        <Route
          index
          element={
            <DashboardOverviewPage
              userName={userProfile.name ?? userProfile.email}
              userRole={userProfile.role}
              onOpenCreateAppointmentModal={handleOpenCreateAppointmentModal}
              appointments={appointments}
              loadingAppointments={loadingAppointments}
              onAppointmentClick={handleCalendarAppointmentClick}
            />
          }
        />

        <Route path="calendar" element={renderCalendarRoute()} />

        <Route
          path="clients"
          element={
            isSuperAdmin ? (
              <Navigate to="/dashboard/tenants" replace />
            ) : canManageClients ? (
              <ClientsTable
                userProfile={userProfile}
                showDeletedClients={showDeletedClients}
                canDeleteClients={canDeleteClients}
                onToggleShowDeleted={() => setShowDeletedClients((prev: boolean) => !prev)}
                onAddClient={() => setIsCreateClientModalOpen(true)}
                onEditClient={(client: FetchedClient) => {
                  setSelectedClient(client);
                  setIsUpdateClientModalOpen(true);
                }}
                onDeleteClient={(client: FetchedClient) => {
                  setSelectedClient(client);
                  setIsDeleteClientModalOpen(true);
                }}
                availableTags={availableTenantTags}
                onAssignTag={handleAssignTag}
                onRemoveTag={handleRemoveTag}
                canAssignTags={canAssignClientTags}
              />
            ) : (
              <div className="permission-message">{tx("You do not have permission to manage clients.", "Vous n'avez pas la permission de gerer les clients.")}</div>
            )
          }
        />

        <Route
          path="clients/:clientId"
          element={
            isSuperAdmin ? (
              <Navigate to="/dashboard/tenants" replace />
            ) : canManageClients ? (
              <ClientProfilePage />
            ) : (
              <div className="permission-message">{tx("You do not have permission to view client profiles.", "Vous n'avez pas la permission de voir les profils clients.")}</div>
            )
          }
        />

        <Route
          path="services"
          element={
            isSuperAdmin ? <Navigate to="/dashboard/tenants" replace /> : <ServicesView userProfile={userProfile} />
          }
        />
        <Route path="users" element={isSuperAdmin ? <SuperAdminUsersView /> : <StaffManagementView />} />
        <Route path="tenants" element={isSuperAdmin ? <TenantsManagementView /> : <Navigate to="/dashboard" replace />} />

        <Route
          path="settings-tags"
          element={
            isSuperAdmin ? (
              <Navigate to="/dashboard/tenants" replace />
            ) : canManageTagDefinitions ? (
              <TagManagementView />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="settings-business"
          element={
            isSuperAdmin ? (
              <Navigate to="/dashboard/tenants" replace />
            ) : isAdminOrSuper ? (
              <TenantSettingsPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="settings-templates"
          element={
            isSuperAdmin ? (
              <Navigate to="/dashboard/tenants" replace />
            ) : isAdminOrSuper ? (
              <TemplatesView />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <UpdateAppointmentModal
        isOpen={isUpdateApptModalOpen}
        onClose={() => {
          setIsUpdateApptModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSubmit={handleUpdateAppointment}
        appointment={selectedAppointment}
      />
      <DeleteAppointmentModal
        isOpen={isDeleteApptModalOpen}
        onClose={() => {
          setIsDeleteApptModalOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleDeleteAppointment}
        appointment={selectedAppointment}
      />
      <CreateAppointmentModal
        isOpen={isCreateApptModalOpen}
        onClose={() => {
          setIsCreateApptModalOpen(false);
          setSelectedDateForApptCreation(null);
        }}
        onAppointmentCreated={handleCreateAppointmentSuccess}
        tenantServices={publicTenantServices}
        isLoadingServices={loadingPublicServices}
        initialDate={selectedDateForApptCreation}
      />

      {canManageClients && (
        <>
          <CreateClientModal
            isOpen={isCreateClientModalOpen}
            onClose={() => setIsCreateClientModalOpen(false)}
            onSubmit={handleCreateClient}
          />
          <UpdateClientModal
            isOpen={isUpdateClientModalOpen}
            onClose={() => {
              setIsUpdateClientModalOpen(false);
              setSelectedClient(null);
            }}
            onSubmit={handleUpdateClient}
            client={selectedClient}
            availableTags={availableTenantTags}
            onAssignTag={handleAssignTag}
            onRemoveTag={handleRemoveTag}
            canAssignTags={canAssignClientTags}
          />
          <DeleteClientModal
            isOpen={isDeleteClientModalOpen}
            onClose={() => {
              setIsDeleteClientModalOpen(false);
              setSelectedClient(null);
            }}
            onConfirm={handleDeleteClient}
            client={selectedClient}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardRefactored;
