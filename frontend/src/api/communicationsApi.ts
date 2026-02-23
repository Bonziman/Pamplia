// src/api/communicationApi.ts
// --- NEW FILE ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
import { buildApiUrl } from './apiBase';
import {
    ManualLogCreatePayload,
    CommunicationLogOut,
    PaginatedCommunicationsLogResponse
} from '../types/Communication' // Adjust path



/**
 * Creates a manual communication log entry.
 * Calls POST /communications/manual
 */
export const createManualLog = async (payload: ManualLogCreatePayload): Promise<CommunicationLogOut> => {
    try {
        const apiUrl = buildApiUrl("/communications/manual");
        const response = await axiosInstance.post<CommunicationLogOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error("Error creating manual log:", error);
        throw error;
    }
};

/**
 * Fetches paginated communication logs for a specific client.
 * Calls GET /clients/{clientId}/communications/
 */
export const fetchClientCommunications = async (
    clientId: number,
    page: number = 1,
    limit: number = 6 // Default to 6 based on requirements
): Promise<PaginatedCommunicationsLogResponse> => {
    try {
        const apiUrl = buildApiUrl(`/clients/${clientId}/communications/`);
        const response = await axiosInstance.get<PaginatedCommunicationsLogResponse>(
            apiUrl,
            {
                params: { page, limit }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching communications for client ${clientId}:`, error);
        throw error;
    }
};

// Add fetchLogById if needed later
