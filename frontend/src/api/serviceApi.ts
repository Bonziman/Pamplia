// src/api/serviceApi.ts
// --- NEW FILE or Add to existing admin API ---

import axios from './axiosInstance'; // Assuming you have a configured axios instance that includes auth token

// --- Type Definitions ---

// Interface for the service data returned by authenticated endpoints
export interface FetchedService {
    id: number;
    name: string;
    description?: string | null; // Allow null from backend
    duration_minutes: number;
    price: number; // Make sure this matches backend (number, not string)
    tenant_id: number;
}

// Payload for creating a service (matches backend schema ServiceCreate)
export interface ServiceCreatePayload {
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    //tenant_id: number; // Required for creation
}

// Payload for updating a service (matches backend schema ServiceUpdate)
export interface ServiceUpdatePayload {
    name?: string;
    description?: string;
    duration_minutes?: number;
    price?: number;
    // tenant_id should NOT be updatable here
}


// --- API Functions ---

/**
 * Fetches services accessible by the currently authenticated user.
 * (Admin/Staff see their tenant's services, Super Admin sees all).
 * Calls the backend endpoint: GET /services
 */


export const fetchManagedServices = async (): Promise<FetchedService[]> => {
    try {
        const currentHostname = window.location.hostname; 
        const apiUrl = `http://${currentHostname}:8000/services`;
        console.log("Fetching managed services from: /services");
        const response = await axios.get<FetchedService[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching managed services:`, error);
        // Consider more specific error handling based on status code if needed
        throw error; // Re-throw to be handled by the caller component
    }
};

/**
 * Creates a new service. Requires Admin or Super Admin role.
 * Calls the backend endpoint: POST /services
 */
export const createService = async (payload: ServiceCreatePayload): Promise<FetchedService> => {
  try {
    const currentHostname = window.location.hostname; 
        const apiUrl = `http://${currentHostname}:8000/services`;
     console.log("Creating service (tenant from subdomain):", payload);
     // Ensure payload object sent to backend doesn't have tenant_id
     const response = await axios.post<FetchedService>(apiUrl, payload);
     return response.data;
  } catch(error) {
     console.error("Error creating service:", error);
     throw error;
  }
};

/**
 * Updates an existing service. Requires Admin or Super Admin role.
 * Calls the backend endpoint: PATCH /services/{serviceId}
 */
export const updateService = async (serviceId: number, payload: ServiceUpdatePayload): Promise<FetchedService> => {
     try {
        const currentHostname = window.location.hostname; 
        const apiUrl = `http://${currentHostname}:8000/services/${serviceId}`;
        console.log(`Updating service ${serviceId}:`, payload);
        const response = await axios.patch<FetchedService>(apiUrl, payload);
        return response.data;
     } catch(error) {
        console.error(`Error updating service ${serviceId}:`, error);
        throw error;
     }
};

/**
 * Deletes a service. Requires Admin or Super Admin role.
 * Calls the backend endpoint: DELETE /services/{serviceId}
 */
export const deleteService = async (serviceId: number): Promise<void> => {
     try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/services/${serviceId}`;
        console.log(`Deleting service ${serviceId}`);
        // Expects 204 No Content, so no response data processing needed
        await axios.delete(apiUrl);
     } catch(error) {
        console.error(`Error deleting service ${serviceId}:`, error);
        throw error;
     }
};
