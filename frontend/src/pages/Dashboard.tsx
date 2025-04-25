// src/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useAuth } from "../auth/authContext";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../api/userApi";
import {
  fetchAppointments,
  updateAppointment,
  deleteAppointment,
  FetchedAppointment,
  AppointmentUpdatePayload
} from "../api/appointmentApi";
import Modal from "../components/Modal";
import './Dashboard.css';
import { formatReadableDateTime, formatForDateTimeLocalInput } from "../utils/formatDate";

// --- Interfaces ---
interface FetchedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
}
const appointmentStatuses = ["pending", "confirmed", "cancelled", "done"];
// --- Dashboard Component ---
const Dashboard: React.FC = () => {
  const { isAuthenticated, userProfile, logout, isLoading: authIsLoading } = useAuth();

  const [users, setUsers] = useState<FetchedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(true);
  const navigate = useNavigate();

  // --- State for Modals ---
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<FetchedAppointment | null>(null);
  const [updateFormData, setUpdateFormData] = useState<AppointmentUpdatePayload>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // --- NEW: State for inline status update ---
  const [isSubmittingStatusChange, setIsSubmittingStatusChange] = useState<number | null>(null); // Store ID of appt being updated, or null


  // --- Derived Permissions ---
  // Use optional chaining for safety before userProfile is guaranteed
  const canViewUsers = userProfile?.role === "super_admin" || userProfile?.role === "admin";
  const canDeleteAppointments = userProfile?.role === "super_admin" || userProfile?.role === "admin";

  // --- Handlers ---
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleOpenUpdateModal = useCallback((appointment: FetchedAppointment) => {
    setSelectedAppointment(appointment);
    // Use the new formatter for the input field
    const formattedTimeForInput = formatForDateTimeLocalInput(appointment.appointment_time);
    setUpdateFormData({
      client_name: appointment.client_name,
      client_email: appointment.client_email,
      appointment_time: formattedTimeForInput, // Use formatted time for input
      status: appointment.status,
    });
    setModalError(null);
    setIsUpdateModalOpen(true);
  }, []); // Dependency array is empty // Empty dependency array: function itself doesn't change

  const handleCloseUpdateModal = useCallback(() => {
    setIsUpdateModalOpen(false);
    setSelectedAppointment(null);
    setUpdateFormData({});
    setModalError(null); // Also clear error on close
  }, []);

  const handleUpdateFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setIsSubmittingModal(true);
    setModalError(null);

    try {
      const payload: AppointmentUpdatePayload = {
          ...updateFormData,
          appointment_time: updateFormData.appointment_time ? new Date(updateFormData.appointment_time).toISOString() : undefined
      };
      const updatedAppt = await updateAppointment(selectedAppointment.id, payload);
      setAppointments(prev => prev.map(appt => appt.id === updatedAppt.id ? updatedAppt : appt));
      handleCloseUpdateModal();
    } catch (error: any) {
      console.error("Update failed:", error);
      setModalError(error.response?.data?.detail || "Failed to update appointment.");
    } finally {
       setIsSubmittingModal(false);
    }
  };

  const handleOpenDeleteModal = useCallback((appointment: FetchedAppointment) => {
    setSelectedAppointment(appointment);
    setModalError(null);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedAppointment(null);
     setModalError(null); // Also clear error on close
  }, []);

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
     setIsSubmittingModal(true);
     setModalError(null);
    try {
      await deleteAppointment(selectedAppointment.id);
      setAppointments(prev => prev.filter(appt => appt.id !== selectedAppointment.id));
      handleCloseDeleteModal();
    } catch (error: any) {
      console.error("Delete failed:", error);
      setModalError(error.response?.data?.detail || "Failed to delete appointment.");
    } finally {
        setIsSubmittingModal(false);
    }
  };

   // --- NEW: Handler for inline status change ---
   const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>, appointmentId: number) => {
    const newStatus = event.target.value;
    console.log(`[handleStatusChange] Dropdown selected value for ID ${appointmentId}: '${newStatus}' (Type: ${typeof newStatus})`);
    // Optional: Find original status to prevent update if unchanged
    const originalAppointment = appointments.find(a => a.id === appointmentId);
    if (!originalAppointment || originalAppointment.status === newStatus) {
        console.log(`Status for ${appointmentId} already ${newStatus} or appointment not found.`);
        return; // No change needed
    }

    setIsSubmittingStatusChange(appointmentId); // Indicate which appointment is updating
    try {
      console.log(`Attempting to update status for appointment ${appointmentId} to ${newStatus}`);
      const updatedAppt = await updateAppointment(appointmentId, { status: newStatus });
      // Update local state
      setAppointments(prev => prev.map(appt => appt.id === updatedAppt.id ? updatedAppt : appt));
      console.log(`Successfully updated status for appointment ${appointmentId}`);
    } catch (error) {
      console.error(`Failed to update status for appointment ${appointmentId}:`, error);
      // TODO: Consider showing a temporary error to the user (e.g., toast notification)
      // Reverting dropdown visually is complex, often better to just log and let user retry
    } finally {
      setIsSubmittingStatusChange(null); // Clear loading state
    }
  };

  // --- Fetch Data Effect ---
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && userProfile) {
      // Fetch Appointments
      setLoadingAppointments(true); // Set loading true before fetch
      fetchAppointments()
        .then(data => setAppointments(data))
        .catch(error => console.error("Failed to load appointments", error))
        .finally(() => setLoadingAppointments(false));

      // Fetch Users if allowed
      if (canViewUsers) {
        setLoadingUsers(true); // Set loading true before fetch
        fetchUsers()
          .then(data => setUsers(data))
          .catch(error => console.error("Failed to load users", error))
          .finally(() => setLoadingUsers(false));
      } else {
        setLoadingUsers(false);
      }
    } else if (!authIsLoading) {
      setLoadingUsers(false);
      setLoadingAppointments(false);
    }
  }, [authIsLoading, isAuthenticated, userProfile, canViewUsers]); // Correct dependencies


  // --- Render Logic ---

  if (authIsLoading) {
    return <div className="loading-message">Loading Authentication...</div>;
  }

  // Now userProfile is guaranteed to exist if isAuthenticated is true after loading
  if (!isAuthenticated || !userProfile) {
     return <div className="permission-message">Not authenticated. Redirecting...</div>;
  }

  // *******************************************
  // *** RECONSTRUCTED RETURN STATEMENT START ***
  // *******************************************
  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="welcome-info">
            <h1>Welcome, {userProfile.name}</h1>
            <p>Your role: {userProfile.role}</p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {/* Appointments Section */}
      <div className="dashboard-section">
        <h2>My Appointments</h2>
        {loadingAppointments ? (
          <div className="loading-message">Loading appointments...</div>
        ) : ( // This parenthesis closes the loading check
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client Name</th>
                <th>Client Email</th>
                <th>Time</th>
                <th>Status</th>
                <th>Service ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? (
                 appointments.map((appt) => ( // Ensure 'appt' has correct type implicitly or explicitly
                  <tr key={appt.id}>
                    <td>{appt.id}</td>
                    <td>{appt.client_name}</td>
                    <td>{appt.client_email}</td>
                    <td>{formatReadableDateTime(appt.appointment_time)}</td>
                    <td>{appt.status}</td>
                    <td>{appt.service_id}</td>
                    {/* --- Actions Cell --- */}
                    <td style={{ display: 'flex', gap: '5px', alignItems: 'center', whiteSpace: 'nowrap' }}> {/* Use flex for inline layout */}
                        {/* Status Dropdown */}
                        <select
                            value={appt.status}
                            onChange={(e) => handleStatusChange(e, appt.id)}
                            disabled={isSubmittingStatusChange === appt.id} // Disable only the one being updated
                            style={{ padding: '2px 4px', fontSize: '0.85em' }} // Minimal styling
                            title="Change Status"
                        >
                            {appointmentStatuses.map(status => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)} {/* Capitalize */}
                                </option>
                            ))}
                        </select>

                        {/* Edit Button */}
                        <button onClick={() => handleOpenUpdateModal(appt)} title="Edit Appointment Details" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: '0 5px' }}>
                           ✏️
                        </button>

                        {/* Delete Button (Conditional) */}
                        {canDeleteAppointments && (
                             <button onClick={() => handleOpenDeleteModal(appt)} title="Delete Appointment" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: 'red', padding: '0 5px' }}>
                                🗑️
                             </button>
                        )}
                    </td>
                  </tr>
                 )) // This parenthesis closes the map function's callback
              ) : ( // This parenthesis opens the "else" part of appointments.length > 0
                  <tr>
                      <td colSpan={7} className="permission-message">No appointments found.</td> {/* Adjusted colSpan */}
                  </tr>
              )} {/* This curly brace closes the "else" part */}
            </tbody>
          </table>
        )} {/* This curly brace closes the "else" part of loadingAppointments */}
      </div>

      <hr />

      {/* Users Section (Conditionally Rendered) */}
      {canViewUsers && ( // Check if user can view users
        <div className="dashboard-section"> {/* Wrap in div */}
          <h2>Users Dashboard</h2>
          {loadingUsers ? (
            <div className="loading-message">Loading users list...</div>
          ) : ( // This parenthesis closes loadingUsers check
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tenant ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => ( // Ensure 'u' has correct type implicitly or explicitly
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.tenant_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )} {/* This curly brace closes the "else" part of loadingUsers */}
        </div> // Close the wrapping div
      )} {/* This curly brace closes the canViewUsers check */}

      {/* --- Modals --- */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        title={`Update Appointment #${selectedAppointment?.id}`}
      >
         {/* Update Form Content */}
         {selectedAppointment && (
           <form onSubmit={handleUpdateSubmit} className="modal-form">
            <div>
              <label htmlFor="client_name">Client Name</label>
              <input type="text" id="client_name" name="client_name" value={updateFormData.client_name || ''} onChange={handleUpdateFormChange} required disabled={isSubmittingModal}/>
            </div>
            <div>
              <label htmlFor="client_email">Client Email</label>
              <input type="email" id="client_email" name="client_email" value={updateFormData.client_email || ''} onChange={handleUpdateFormChange} required disabled={isSubmittingModal}/>
            </div>
            <div>
            <label htmlFor="appointment_time">Appointment Time</label>
              <input
                type="datetime-local"
                id="appointment_time"
                name="appointment_time"
                // Use the new formatter for the input field
                value={updateFormData.appointment_time || ''}
                onChange={handleUpdateFormChange}
                required
                disabled={isSubmittingModal}
              />
            </div>
             <div>
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={updateFormData.status || ''} onChange={handleUpdateFormChange} required disabled={isSubmittingModal}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Done</option>
                </select>
            </div>
            {modalError && <p style={{ color: 'red' }}>{modalError}</p>}
            <div className="modal-actions">
              <button type="button" className="modal-button-cancel" onClick={handleCloseUpdateModal} disabled={isSubmittingModal}>Cancel</button>
              <button type="submit" className="modal-button-confirm" disabled={isSubmittingModal}>
                {isSubmittingModal ? "Saving..." : "Save Changes"}
              </button>
            </div>
           </form>
         )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={`Confirm Deletion`}
      >
          {/* Delete Confirmation Content */}
         {selectedAppointment && (
            <div>
                 <p>Are you sure you want to delete the appointment for <strong>{selectedAppointment.client_name}</strong> at {new Date(selectedAppointment.appointment_time).toLocaleString()}?</p>
                 {modalError && <p style={{ color: 'red' }}>{modalError}</p>}
                 <div className="modal-actions">
                    <button type="button" className="modal-button-cancel" onClick={handleCloseDeleteModal} disabled={isSubmittingModal}>Cancel</button>
                    <button type="button" className="modal-button-delete" onClick={handleConfirmDelete} disabled={isSubmittingModal}>
                        {isSubmittingModal ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
         )}
      </Modal>

    </div> // End dashboard-container
  );
};

export default Dashboard;
