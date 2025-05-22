// src/api/clientApi.ts

import axios from './axiosInstance'; // Use your configured axios instance
import { FetchedAppointment } from './appointmentApi';

// --- Type Definitions ---

// Interface for Tag (matching backend TagOut)
export interface ClientTag {
    id: number;
    tag_name: string;
    color_hex?: string | null;
    icon_identifier?: string | null;
    // Ensure this matches your app.schemas.tag.TagOut if you add more fields there
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
    created_at: string; // ISO DateTime string
    updated_at: string; // ISO DateTime string
    // deleted_at?: string | null; // If you include it in ClientOut
    tags: ClientTag[]; // Array of associated tags
}

// Payload for creating a client manually (matches backend ClientCreateRequest)
export interface ClientCreatePayload {
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
    // tenant_id is not needed here as it's derived from context or super_admin choice
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
    is_confirmed?: boolean;
}

// --- NEW: Interface for Paginated API Response ---
// This should match your app.schemas.pagination.PaginatedResponse generic structure
export interface PaginatedResponse<T> {
    total: number;
    page: number;
    limit: number;
    items: T[];
}

// --- NEW: Parameters for fetching clients ---
export interface FetchClientsParams {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    searchTerm?: string;
    tagIds?: string; // Comma-separated string of tag IDs, e.g., "1,2,3"
    sortBy?: string; // e.g., 'last_name', 'email', 'created_at'
    sortDirection?: 'asc' | 'desc';
}


// --- API Functions ---

/**
 * Fetches a single client by their ID.
 * Calls the backend endpoint: GET /clients/{clientId}
 */
export const fetchClientById = async (clientId: number, includeDeleted: boolean = false): Promise<FetchedClient> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}`; // Ensure no trailing slash if backend route is defined without it
        const params = { include_deleted: includeDeleted };
        console.log(`Fetching client ${clientId} from: ${apiUrl} with params:`, params);
        const response = await axios.get<FetchedClient>(apiUrl, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        throw error;
    }
};


/**
 * MODIFIED: Fetches clients with pagination, filtering, and sorting.
 * Calls the backend endpoint: GET /clients/
 * (Backend endpoint was renamed to get_clients_paginated but route is still GET /clients/)
 */
export const fetchClients = async (
    params: FetchClientsParams = {} // Use the new params interface
): Promise<PaginatedResponse<FetchedClient>> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/`; // Ensure no trailing slash if backend route is defined without it

        // Construct query parameters, removing undefined values
        const queryParams: Record<string, any> = {};
        if (params.page !== undefined) queryParams.page = params.page;
        if (params.limit !== undefined) queryParams.limit = params.limit;
        if (params.includeDeleted !== undefined) queryParams.include_deleted = params.includeDeleted;
        if (params.searchTerm) queryParams.search_term = params.searchTerm;
        if (params.tagIds) queryParams.tag_ids = params.tagIds; // Pass as string "1,2,3"
        if (params.sortBy) queryParams.sort_by = params.sortBy;
        if (params.sortDirection) queryParams.sort_direction = params.sortDirection;

        console.log("Fetching clients from:", apiUrl, "with params:", queryParams);
        const response = await axios.get<PaginatedResponse<FetchedClient>>(apiUrl, { params: queryParams });
        return response.data;
    } catch (error) {
        console.error(`Error fetching clients:`, error);
        throw error;
    }
};

/**
 * Creates a new client manually.
 * Calls the backend endpoint: POST /clients/
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
 * Updates an existing client.
 * Calls the backend endpoint: PATCH /clients/{clientId}/
 */
export const updateClient = async (clientId: number, payload: ClientUpdatePayload): Promise<FetchedClient> => {
     try {
        const currentHostname = window.location.hostname;
        // Assuming your backend PATCH for client might expect a trailing slash like others
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
 * Soft-deletes a client.
 * Calls the backend endpoint: DELETE /clients/{clientId}/
 */
export const deleteClient = async (clientId: number): Promise<void> => {
     try {
        const currentHostname = window.location.hostname;
        // Assuming your backend DELETE for client might expect a trailing slash
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/`; 
        console.log(`Deleting client ${clientId}`);
        await axios.delete(apiUrl);
     } catch(error) {
        console.error(`Error deleting client ${clientId}:`, error);
        throw error;
     }
};

/**
 * Assigns a tag to a client.
 * Calls the backend endpoint: POST /clients/{clientId}/tags/{tagId}
 */
export const assignClientTag = async (clientId: number, tagId: number): Promise<FetchedClient> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/tags/${tagId}`; // No trailing slash as per your original client router for this
        console.log(`Assigning tag ${tagId} to client ${clientId}`);
        const response = await axios.post<FetchedClient>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error assigning tag ${tagId} to client ${clientId}:`, error);
        throw error;
    }
};

/**
 * Removes a tag from a client.
 * Calls the backend endpoint: DELETE /clients/{clientId}/tags/{tagId}
 */
export const removeClientTag = async (clientId: number, tagId: number): Promise<void> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/tags/${tagId}`; // No trailing slash
        console.log(`Removing tag ${tagId} from client ${clientId}`);
        await axios.delete(apiUrl);
    } catch (error) {
        console.error(`Error removing tag ${tagId} from client ${clientId}:`, error);
        throw error;
    }
};

/**
 * Fetches appointments for a specific client.
 * Calls backend endpoint: GET /clients/{clientId}/appointments/
 */
export const fetchClientAppointments = async (clientId: number): Promise<FetchedAppointment[]> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/clients/${clientId}/appointments/`; // Assuming trailing slash
        console.log(`Fetching appointments for client ${clientId} via ${apiUrl}`);
        const response = await axios.get<FetchedAppointment[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching appointments for client ${clientId}:`, error);
        throw error;
    }
}
