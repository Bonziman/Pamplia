// src/api/clientApi.ts
// --- NEW FILE ---

import axios from './axiosInstance'; // Use your configured axios instance
import { FetchedAppointment } from './appointmentApi';

// --- Type Definitions ---

// Interface for Tag (matching backend TagOut) - might move to a shared types file
export interface ClientTag {
    id: number;
    tag_name: string;
    color_hex?: string | null;
    icon_identifier?: string | null;
}

// Interface for Client data (matching backend ClientOut)
export interface FetchedClient {
    id: number;
    tenant_id: number;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_postal_code?: string | null;
    address_country?: string | null;
    birthday?: string | null; // Date string (YYYY-MM-DD)
    notes?: string | null;
    is_confirmed: boolean;
    is_deleted: boolean;
    tags: ClientTag[]; // Array of associated tags
    created_at: string; // ISO DateTime string
    updated_at: string; // ISO DateTime string
    // deleted_at?: string | null; // If you include it
}

// Payload for creating a client manually (matches backend ClientCreateRequest)
export interface ClientCreatePayload {
    first_name?: string;
    last_name?: string;
    email?: string; // Required for backend lookup often, but optional here if backend handles it
    phone_number?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_postal_code?: string;
    address_country?: string;
    birthday?: string; // YYYY-MM-DD format
    notes?: string;
}

// Payload for updating a client (matches backend ClientUpdate)
export interface ClientUpdatePayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_postal_code?: string;
    address_country?: string;
    birthday?: string; // YYYY-MM-DD format
    notes?: string;
    is_confirmed?: boolean; // Allow updating confirmation status
}


// --- API Functions ---


/**
 * Fetches a single client by their ID.
 * Requires appropriate permissions on the backend.
 * Calls the backend endpoint: GET /clients/{clientId}
 */
export const fetchClientById = async (clientId: number, includeDeleted: boolean = false): Promise<FetchedClient> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}`;
        const params = { include_deleted: includeDeleted };
        console.log(`Fetching client ${clientId} from: ${apiUrl} with params:`, params);
        const response = await axios.get<FetchedClient>(apiUrl, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        throw error; // Re-throw to be handled by the calling component
    }
};



/**
 * Fetches clients accessible by the currently authenticated user.
 * Staff/Admin see their tenant's clients, Super Admin sees all.
 * Calls the backend endpoint: GET /clients
 */
export const fetchClients = async (includeDeleted: boolean = false): Promise<FetchedClient[]> => {
    try {
      const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/`;
        const params = { include_deleted: includeDeleted };
        console.log("Fetching clients from: /clients with params:", params);
        const response = await axios.get<FetchedClient[]>(apiUrl, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching clients:`, error);
        throw error;
    }
};

/**
 * Creates a new client manually. Requires Staff, Admin, or Super Admin role.
 * Tenant is determined by subdomain context on the backend.
 * Calls the backend endpoint: POST /clients
 */
export const createClient = async (payload: ClientCreatePayload): Promise<FetchedClient> => {
     try {
      const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/`;
        console.log("Creating client:", payload);
        const response = await axios.post<FetchedClient>(apiUrl, payload);
        return response.data;
     } catch(error) {
        console.error("Error creating client:", error);
        throw error;
     }
};

/**
 * Updates an existing client. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: PATCH /clients/{clientId}
 */
export const updateClient = async (clientId: number, payload: ClientUpdatePayload): Promise<FetchedClient> => {
     try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/`;
        console.log(`Updating client ${clientId}:`, payload);
        const response = await axios.patch<FetchedClient>(apiUrl, payload);
        return response.data;
     } catch(error) {
        console.error(`Error updating client ${clientId}:`, error);
        throw error;
     }
};

/**
 * Soft-deletes a client. Requires Admin or Super Admin role.
 * Calls the backend endpoint: DELETE /clients/{clientId}
 */
export const deleteClient = async (clientId: number): Promise<void> => {
     try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/`;
        console.log(`Deleting client ${clientId}`);
        await axios.delete(apiUrl); // Expects 204 No Content
     } catch(error) {
        console.error(`Error deleting client ${clientId}:`, error);
        throw error;
     }
};

/**
 * Assigns a tag to a client. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: POST /clients/{clientId}/tags/{tagId}
 */
export const assignClientTag = async (clientId: number, tagId: number): Promise<FetchedClient> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/tags/${tagId}`;
        console.log(`Assigning tag ${tagId} to client ${clientId}`);
        const response = await axios.post<FetchedClient>(apiUrl);
        return response.data; // Returns the updated client
    } catch (error) {
        console.error(`Error assigning tag ${tagId} to client ${clientId}:`, error);
        throw error;
    }
};

/**
 * Removes a tag from a client. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: DELETE /clients/{clientId}/tags/{tagId}
 */
export const removeClientTag = async (clientId: number, tagId: number): Promise<void> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/tags/${tagId}`;
        console.log(`Removing tag ${tagId} from client ${clientId}`);
        await axios.delete(apiUrl); // Expects 204 No Content
    } catch (error) {
        console.error(`Error removing tag ${tagId} from client ${clientId}:`, error);
        throw error;
    }
};

export const fetchClientAppointments = async (clientId: number): Promise<FetchedAppointment[]> => {
    try {
        const currentHostname = window.location.hostname;
        // Ensure this backend endpoint exists and returns the correct structure
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/appointments/`;
        console.log(`Fetching appointments for client ${clientId} via ${apiUrl}`);
        const response = await axios.get<FetchedAppointment[]>(apiUrl); // Expect an array
        return response.data;
    } catch (error) {
        console.error(`Error fetching appointments for client ${clientId}:`, error);
        throw error;
    }
}
