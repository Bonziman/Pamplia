// src/api/appointmentApi.ts
import axios from "axios";
import axiosInstance from "./axiosInstance";

export interface FetchedAppointment {
    id: number;
    client_name: string;
    client_email: string;
    appointment_time: string;
    service_id: number;
    tenant_id: number;
    status: string;
    service_name?: string;
}

// Interface for the data sent when updating
// Make fields optional as it's a PATCH
export interface AppointmentUpdatePayload {
    client_name?: string;
    client_email?: string;
    appointment_time?: string; // Send as ISO string or whatever backend expects
    status?: string; // Send valid status enum value
    // Add other updatable fields if necessary (e.g., service_id)
}


export const fetchAppointments = async (): Promise<FetchedAppointment[]> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/appointments/`;
        console.log("Fetching appointments from:", apiUrl);
        const response = await axiosInstance.get<FetchedAppointment[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error fetching appointments:", error);
        if (axios.isAxiosError(error)) { /* ... error logging ... */ }
        throw error;
    }
};

// --- NEW: Update Appointment Function ---
export const updateAppointment = async (
    id: number,
    updateData: AppointmentUpdatePayload
): Promise<FetchedAppointment> => {
    try {
        const currentHostname = window.location.hostname;
        // Use the /update/{id} endpoint structure from backend
        const apiUrl = `http://${currentHostname}:8000/appointments/${id}`;
        console.log(`Updating appointment ${id} at: ${apiUrl}`, updateData);
        // Use PATCH method
        const response = await axiosInstance.patch<FetchedAppointment>(apiUrl, updateData);
        console.log(`Appointment ${id} updated successfully:`, response.data);
        return response.data; // Return updated appointment
    } catch (error) {
        console.error(`Error updating appointment ${id}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        }
        throw error; // Re-throw for component handling
    }
};

// --- NEW: Delete Appointment Function ---
export const deleteAppointment = async (id: number): Promise<void> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/appointments/${id}`; // Use DELETE on /{id}
        console.log(`Deleting appointment ${id} at: ${apiUrl}`);
        // Use DELETE method - expects 204 No Content on success
        await axiosInstance.delete(apiUrl);
        console.log(`Appointment ${id} deleted successfully.`);
        // No return value needed for delete
    } catch (error) {
        console.error(`Error deleting appointment ${id}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        }
        throw error; // Re-throw for component handling
    }
};
