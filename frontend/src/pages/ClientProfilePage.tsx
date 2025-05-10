// src/pages/ClientProfilePage.tsx
// --- FULL REPLACEMENT - COMPLETE CODE ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// API Imports
import { fetchClientById, updateClient, FetchedClient, ClientUpdatePayload, ClientTag } from '../api/clientApi';
import { fetchPaginatedAppointments, FetchedAppointment, PaginatedAppointments } from '../api/appointmentApi';
import { fetchTenantServices, createPublicAppointment, PublicService, AppointmentCreatePayload as PublicAppointmentCreatePayload } from '../api/publicApi'; // For Modal

// --- Components ---
import { StatusBadge } from '../components/StatusBadge';
import CreateAppointmentModal from '../components/modals/CreateAppointmentModal'; // Import the modal

// Styles
import './ClientProfilePage.css';
import '../components/TableStyles.css';

// Communications imports
import LogInteractionModal from '../components/modals/LogInteractionModal';
import ActivityFeed from '../components/activity/ActivityFeed';
import { createManualLog } from '../api/communicationsApi'; // API function
import { ManualLogCreatePayload } from '../types/Communication'; // Type for payload
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons'; // Icon for button

// Default Avatar
const DEFAULT_AVATAR = '/defaults/icons8-male-user-94.png'; // Adjust path as needed

// --- Pagination Controls Component (Complete) ---
interface PaginationProps { currentPage: number; totalPages: number; onPageChange: (page: number) => void; }
const PaginationControls: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust range if it's too small near the edges
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="pagination-controls">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                {'<'} Previous
            </button>

            {startPage > 1 && (
                <>
                    <button onClick={() => onPageChange(1)}>1</button>
                    {startPage > 2 && <span>...</span>}
                </>
            )}

            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={currentPage === number ? 'active' : ''}
                >
                    {number}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span>...</span>}
                    <button onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                </>
            )}

            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Next {'>'}
            </button>
        </div>
    );
};


const ClientProfilePage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    // --- States ---
    const [client, setClient] = useState<FetchedClient | null>(null);
    const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
    const [isLoadingClient, setIsLoadingClient] = useState(true);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
    const [error, setError] = useState<string | null>(null); // Combined error state

    // State for Communication Log Modal 
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);

    // Appointment List State
    const [appointmentPage, setAppointmentPage] = useState(1);
    const [appointmentLimit, setAppointmentLimit] = useState(10);
    const [appointmentTotalItems, setAppointmentTotalItems] = useState(0);
    const [appointmentFilter, setAppointmentFilter] = useState('all');

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedClientData, setEditedClientData] = useState<Partial<ClientUpdatePayload>>({});
    const [isSaving, setIsSaving] = useState(false);

    // --- State for Create Appointment Modal ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [publicTenantServices, setPublicTenantServices] = useState<PublicService[]>([]);
    const [loadingPublicServices, setLoadingPublicServices] = useState(false);

    // --- Permissions ---
    const canEditClient = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'staff';
    const canAddAppointment = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'staff';

    // --- Data Fetching ---
    const loadClientDetails = useCallback(() => {
        if (!clientId) return;
        setIsLoadingClient(true); setError(null);
        fetchClientById(parseInt(clientId, 10))
            .then(data => {
                setClient(data);
                // Initialize edit state with current data
                setEditedClientData({
                    first_name: data.first_name ?? '',
                    last_name: data.last_name ?? '',
                    email: data.email ?? '',
                    phone_number: data.phone_number ?? '',
                    birthday: data.birthday ?? '',
                    notes: data.notes ?? '',
                });
            })
            .catch(err => {
                console.error("Error fetching client:", err);
                setError("Failed to load client details.");
                setClient(null); // Clear client on error
            })
            .finally(() => setIsLoadingClient(false));
    }, [clientId]);

    const loadClientAppointments = useCallback(() => {
        if (!clientId) return;
        setIsLoadingAppointments(true);
        fetchPaginatedAppointments(parseInt(clientId, 10), appointmentFilter, appointmentPage, appointmentLimit)
            .then(data => {
                setAppointments(data.items);
                setAppointmentTotalItems(data.total);
            })
            .catch(err => {
                console.error("Error fetching appointments:", err);
                setError(prev => prev ? `${prev} | Failed to load appointments.` : "Failed to load appointment history.");
            })
            .finally(() => setIsLoadingAppointments(false));
    }, [clientId, appointmentFilter, appointmentPage, appointmentLimit]);

    // Fetch public services needed for the modal
    const loadPublicServices = useCallback(() => {
        setLoadingPublicServices(true);
        console.log("ClientProfilePage: Fetching public services...");
        fetchTenantServices()
            .then(data => {
                console.log("ClientProfilePage: Public services success", data);
                setPublicTenantServices(data);
            })
            .catch(err => {
                console.error("ClientProfilePage: Public services error", err);
                setPublicTenantServices([]);
            })
            .finally(() => setLoadingPublicServices(false));
    }, []);

    const appointmentTotalPages = useMemo(() => Math.ceil(appointmentTotalItems / appointmentLimit), [appointmentTotalItems, appointmentLimit]);

    // Initial Load
    useEffect(() => { loadClientDetails(); }, [loadClientDetails]);
    useEffect(() => { loadClientAppointments(); }, [loadClientAppointments]);

    // --- Handlers ---
    const handleEditToggle = () => {
        // Reset edit data to current client state when entering edit mode
        if (!isEditMode && client) {
            setEditedClientData({
                first_name: client.first_name ?? '',
                last_name: client.last_name ?? '',
                email: client.email ?? '',
                phone_number: client.phone_number ?? '',
                birthday: client.birthday ?? '',
                notes: client.notes ?? '',
            });
        }
        setIsEditMode(!isEditMode);
        setError(null); // Clear errors when toggling mode
    };

    // --- Handlers for Manual Log Modal ---
    const handleOpenLogModal = () => {
        if (!client) return; // Ensure client is loaded
        setIsLogModalOpen(true);
    };

    const handleCloseLogModal = () => {
        setIsLogModalOpen(false);
    };

    const handleSaveManualLog = useCallback(async (payload: ManualLogCreatePayload) => {
        console.log("ClientProfilePage: Saving manual log...", payload);
        setError(null); // Clear page error before save
        try {
            await createManualLog(payload);
            console.log("ClientProfilePage: Manual log creation success.");
            handleCloseLogModal(); // Close modal on success
            // TODO: Trigger refresh of ActivityFeed component
            // This might happen automatically if ActivityFeed refetches on prop change,
            // or we might need a more explicit refresh mechanism (e.g., passing a refresh counter prop).
            // For now, closing modal is the main action. Activity feed might refetch on next load.
        } catch (apiError: any) {
            console.error("ClientProfilePage: Manual log creation failed:", apiError);
            // Re-throw the error so the modal's catch block can handle displaying it
            throw apiError;
        }
    }, []); // No direct dependencies here, relies on modal payload

    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedClientData(prev => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setError(null);
        // Reset edit data from original client state (important!)
        if (client) {
            setEditedClientData({
                first_name: client.first_name ?? '',
                last_name: client.last_name ?? '',
                email: client.email ?? '',
                phone_number: client.phone_number ?? '',
                birthday: client.birthday ?? '',
                notes: client.notes ?? '',
            });
        }
    };

    const handleSaveChanges = async () => {
        if (!client || !canEditClient) return;
        setIsSaving(true);
        setError(null);

        const payload: ClientUpdatePayload = {};
        // Compare edited data with original client data to build payload
        Object.entries(editedClientData).forEach(([key, value]) => {
            const originalValue = (client as any)[key] ?? ''; // Get original value, handle null/undefined
            // Only include field if it changed AND handle empty strings becoming null
            if (value !== originalValue) {
                 (payload as any)[key] = value === '' ? null : value;
            }
        });

        // If nothing changed, just exit edit mode
        if (Object.keys(payload).length === 0) {
            setIsEditMode(false);
            setIsSaving(false);
            return;
        }

        try {
            await updateClient(client.id, payload);
            setIsEditMode(false); // Exit edit mode on success
            loadClientDetails(); // Refresh details to show saved data
        } catch (err: any) {
            console.error("Failed to update client:", err);
            setError(err.response?.data?.detail || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAppointmentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAppointmentFilter(e.target.value);
        setAppointmentPage(1); // Reset to first page on filter change
    };

    const handleAppointmentPageChange = (page: number) => {
        setAppointmentPage(page);
    };

    // --- Handlers for Create Appointment Modal ---
    const handleOpenCreateModal = useCallback(() => {
        if (!client) return; // Safety check
        loadPublicServices(); // Fetch services needed for the modal
        setIsCreateModalOpen(true);
    }, [client, loadPublicServices]);

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    const handleCreateAppointment = useCallback(async (data: PublicAppointmentCreatePayload) => {
        console.log("ClientProfilePage: Submitting appointment from modal...", data);
        try {
            await createPublicAppointment(data);
            console.log("ClientProfilePage: Appointment creation success.");
            handleCloseCreateModal(); // Close modal on success
            loadClientAppointments(); // Refresh the appointment list
        } catch (apiError: any) {
            console.error("ClientProfilePage: Appointment creation failed:", apiError);
            // Re-throw error so the modal can display it
            throw apiError;
        }
    }, [loadClientAppointments]);


    // Date/Time Formatters
    const formatDate = (dateString: string | undefined | null): { day: string, month: string } => {
        if (!dateString) return { day: '--', month: '---'};
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString();
            const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            return { day, month };
        } catch (e) {
            return { day: '!!', month: 'ERR'};
        }
    };

    const formatTime = (dateString: string | undefined | null): string => {
        if (!dateString) return '--:--';
        try {
            const date = new Date(dateString);
            // Ensure locale options give 24hr format if needed, or use date-fns format
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return 'Error';
        }
    };

    // --- Render Logic ---
    if (isLoadingClient) return <div className="loading-message">Loading Client Profile... <FontAwesomeIcon icon={faSpinner} spin /></div>;
    if (error && !client && !isLoadingClient) return <div className="error-message global-error">Error: {error} <FontAwesomeIcon icon={faExclamationTriangle} /> <button onClick={loadClientDetails}>Retry</button></div>;
    if (!client) return <div className="loading-message">Client not found or could not be loaded.</div>;
    const clientIdNum = parseInt(clientId || '0', 10); // Get client ID as number
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client';

    return (
        <> {/* Use Fragment to wrap page content and modal */}
            <div className="client-profile-page">
                {/* --- Left Column --- */}
                <div className="profile-left-column">
                    <div className="client-info-card">
                         <span className="profile-avatar-large">
                             <img src={DEFAULT_AVATAR} alt={fullName} />
                         </span>
                        <div className="client-name-header">
                            <h2>{fullName}</h2>
                            <span
                                className={`confirmation-badge ${client.is_confirmed ? 'confirmed' : 'unconfirmed'}`}
                                title={client.is_confirmed ? 'Client Confirmed' : 'Client Not Confirmed'}
                            >
                                <FontAwesomeIcon icon={faCheckCircle} />
                            </span>
                        </div>
                        <div className="client-tags-list">
                             {client.tags?.map(tag => (
                                <span key={tag.id} className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>
                                    {tag.tag_name}
                                </span>
                            ))}
                             {(!client.tags || client.tags.length === 0) && <span className="no-tags-assigned">No tags</span>}
                        </div>
                         {canAddAppointment && (
                             <button
                                onClick={handleOpenCreateModal}
                                className="button button-primary add-appointment-btn"
                             >
                                 Add New Appointment
                             </button>
                         )}
                         <button
                             onClick={handleOpenLogModal}
                             className="button button-secondary add-log-btn" // Style as needed
                             style={{ marginTop: '1rem', width: '100%' }} // Example inline style
                         >
                             <FontAwesomeIcon icon={faPlusCircle} /> Log Interaction
                         </button>
                    </div>

                    <div className="client-details-card">
                         {error && !isLoadingClient && <div className="error-message local-error">Error: {error}</div>}

                         <div className="detail-item">
                            <span className="detail-label">Email</span>
                            {isEditMode ? (
                                <input type="email" name="email" value={editedClientData.email || ''} onChange={handleInputChange} className="form-input" />
                            ) : (
                                <span className="detail-value read-only">{client.email || '-'}</span>
                            )}
                        </div>
                         <div className="detail-item">
                            <span className="detail-label">Phone</span>
                            {isEditMode ? (
                                <input type="tel" name="phone_number" value={editedClientData.phone_number || ''} onChange={handleInputChange} className="form-input" />
                            ) : (
                                <span className="detail-value read-only">{client.phone_number || '-'}</span>
                            )}
                        </div>
                         <div className="detail-item">
                            <span className="detail-label">Birthday</span>
                            {isEditMode ? (
                                <input type="date" name="birthday" value={editedClientData.birthday || ''} onChange={handleInputChange} className="form-input" />
                            ) : (
                                <span className="detail-value read-only">{client.birthday ? new Date(client.birthday).toLocaleDateString() : '-'}</span>
                            )}
                        </div>
                         <div className="detail-item">
                            <span className="detail-label">Notes</span>
                            {isEditMode ? (
                                <textarea name="notes" value={editedClientData.notes || ''} onChange={handleInputChange} className="form-textarea" rows={4}></textarea>
                            ) : (
                                <span className="detail-value read-only" style={{ whiteSpace: 'pre-wrap' }}>{client.notes || '-'}</span>
                            )}
                         </div>

                        {canEditClient && (
                            <div className="profile-edit-actions">
                                {!isEditMode ? (
                                    <button onClick={handleEditToggle} className="button button-secondary">Update Details</button>
                                ) : (
                                    <>
                                        <button onClick={handleSaveChanges} className="button button-primary" disabled={isSaving}>
                                            {isSaving ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : 'Save Changes'}
                                        </button>
                                        <button onClick={handleCancelEdit} className="button button-secondary" disabled={isSaving}>
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Right Column --- */}
                <div className="profile-right-column">
                {clientIdNum > 0 && ( // Render only if clientId is valid
                        <div className="activity-feed-container card"> {/* Wrap in card style? */}
                            <ActivityFeed clientId={clientIdNum} />
                        </div>
                    )}
                    <div className="stats-widgets-container">
                         <div className="stat-widget"><div className="stat-value">{appointmentTotalItems ?? '?'}</div><div className="stat-label">Total Bookings</div></div>
                         <div className="stat-widget"><div className="stat-value">{appointments.filter(appt => (appt.status === 'pending' || appt.status === 'confirmed') && new Date(appt.appointment_time) > new Date()).length}</div><div className="stat-label">Upcoming</div></div>
                         <div className="stat-widget"><div className="stat-value">{appointments.filter(appt => appt.status === 'done' && new Date(appt.appointment_time) < new Date()).length}</div><div className="stat-label">Completed</div></div>
                         <div className="stat-widget"><div className="stat-value">{appointments.filter(appt => appt.status === 'cancelled').length}</div><div className="stat-label">Canceled</div></div>
                         <div className="stat-widget">
                            <div className="stat-value">
                            {appointments.length > 0 ? (
                                <span>
                                {appointments
                                    .filter(appt => appt.status === 'done' && new Date(appt.appointment_time) < new Date())
                                    .reduce((sum, appt) =>
                                        sum + (appt.services?.reduce((s, service) =>
                                        s + (service.price ?? 0), 0) || 0), 0).toFixed(2)} MAD
                                </span>
                            ) : (
                                <span>0.00 MAD</span>
                            )}
                            </div>
                            <div className="stat-label">Total Spent</div>
                         </div>
                    </div>

                    <div className="appointment-history-card">
                         <div className="appointment-history-header">
                            <h3>Appointment History</h3>
                            <div className="appointment-filter">
                                <select value={appointmentFilter} onChange={handleAppointmentFilterChange}>
                                    <option value="all">All Time</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="past">Past</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                </select>
                            </div>
                        </div>
                         {isLoadingAppointments ? (
                            <div className="loading-message">Loading appointments... <FontAwesomeIcon icon={faSpinner} spin /></div>
                         ) : (
                            <>
                                <div className="table-container appointments-list">
                                    <table className="appointments-history-table data-table"> {/* Added data-table for consistency */}
                                        {/* Optional: Add headers if design needs them
                                        <thead>
                                            <tr><th>Date</th><th>Details</th><th>Status</th><th>Price</th></tr>
                                        </thead>
                                        */}
                                        <tbody>
                                            {appointments.length > 0 ? appointments.map(appt => {
                                                const { day, month } = formatDate(appt.appointment_time);
                                                const time = formatTime(appt.appointment_time);
                                                const serviceNames = appt.services?.map(s => s.name).join(', ') || 'Unknown Service';
                                                const totalPrice = appt.services?.reduce((sum, s) => sum + (s.price ?? 0), 0) || 0;
                                                return (
                                                    <tr key={appt.id}>
                                                        <td className="appt-date-col">
                                                            <span className="day">{day}</span>
                                                            <span className="month">{month}</span>
                                                        </td>
                                                        <td className="appt-details-col">
                                                            <span className="service-name">{serviceNames}</span>
                                                            <span className="time-range">{time}</span>
                                                        </td>
                                                        <td className="appt-status-col">
                                                            <StatusBadge status={appt.status} />
                                                        </td>
                                                        <td className="appt-price-col">{totalPrice.toFixed(2)} MAD</td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                                        No appointments found for this filter.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationControls
                                    currentPage={appointmentPage}
                                    totalPages={appointmentTotalPages}
                                    onPageChange={handleAppointmentPageChange}
                                />
                            </>
                         )}
                    </div>
                </div>
            </div>

            {/* Render the modal outside the main page layout */}
            <CreateAppointmentModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateModal}
                onSubmit={handleCreateAppointment}
                tenantServices={publicTenantServices}
                isLoadingServices={loadingPublicServices}
                clientPreInfo={client ? {
                    name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || null,
                    email: client.email || null,
                    phone: client.phone_number || null
                } : undefined}
            />
            <LogInteractionModal
                 isOpen={isLogModalOpen}
                 onClose={handleCloseLogModal}
                 onSave={handleSaveManualLog}
                 clientId={clientIdNum || null} // Pass client ID
            />
        </>
    );
};

export default ClientProfilePage;
