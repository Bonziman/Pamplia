// src/api/appointmentApi.ts
import axios from "axios";
import axiosInstance from "./axiosInstance";
import { buildApiUrl } from "./apiBase";

export interface SimpleService {
    id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price?: number; // Add price if it's in ServiceOut
    tenant_id: number;
}
export interface FetchedAppointment {
    id: number;
    client_name: string;
    client_email: string;
    appointment_time: string; // Keep as string (ISO format from backend)
    tenant_id: number;
    status: string;
    services: SimpleService[]; // <-- ADD this field: an array of SimpleService objects
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

export interface PaginatedAppointments {
    items: FetchedAppointment[]; // The list of appointments for the current page
    total: number;              // Total number of appointments matching the query
    page: number;               // The current page number (usually 1-based)
    limit: number;              // The number of items per page
    // Optional: total number of pages, calculated or returned by backend
    // pages?: number;
}

export const fetchAppointments = async (): Promise<FetchedAppointment[]> => {
    try {
        const apiUrl = buildApiUrl("/appointments/");
        const response = await axiosInstance.get<FetchedAppointment[]>(apiUrl);
        return Array.isArray(response.data) ? response.data : [];
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
        // Use the /update/{id} endpoint structure from backend
        const apiUrl = buildApiUrl(`/appointments/${id}`);
        const response = await axiosInstance.patch<FetchedAppointment>(apiUrl, updateData);
        return response.data;
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
        const apiUrl = buildApiUrl(`/appointments/${id}`);
        await axiosInstance.delete(apiUrl);
    } catch (error) {
        console.error(`Error deleting appointment ${id}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        }
        throw error; // Re-throw for component handling
    }
};


export const fetchPaginatedAppointments = async (
    clientId?: number,
    statusFilter?: string,
    page: number = 1,
    limit: number = 10 // Default page size
): Promise<PaginatedAppointments> => { // Return the paginated structure
    try {
        const apiUrl = buildApiUrl("/appointments/paginated");
        const params: Record<string, any> = { // Use Record for dynamic params
            page: page,
            limit: limit
         };

        if (clientId !== undefined && clientId !== null) {
            params.client_id = clientId;
        }
        // Only add status filter if it's not 'all' or empty
        if (statusFilter && statusFilter.toLowerCase() !== 'all') {
            // Backend needs to handle specific values like 'upcoming', 'past'
            // or just expect enum values ('pending', 'confirmed', etc.)
            params.status = statusFilter.toLowerCase();
        }

        const response = await axiosInstance.get<PaginatedAppointments>(apiUrl, { params });

        return response.data;

    } catch (error) {
        console.error("Error fetching appointments:", error);
        // Improved error logging
        if (axios.isAxiosError(error) && error.response) {
             console.error("API Error Status:", error.response.status);
             console.error("API Error Data:", error.response.data);
        } else if (error instanceof Error) {
             console.error("Error message:", error.message);
        }
        throw error; // Re-throw for component handling
    }
};
