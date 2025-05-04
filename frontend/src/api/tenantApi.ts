// src/api/tenantApi.ts
// --- NEW FILE or Add to existing ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
import { TenantOut, TenantUpdate } from '../types/tenants';


/**
 * Fetches the details of the tenant associated with the currently
 * authenticated user.
 * Calls GET /tenants/me
 */
export const fetchTenantMe = async (): Promise<TenantOut> => {
    try {
        const currentHostname = window.location.hostname; 
        const apiUrl = `http://${currentHostname}:8000/tenants/me`
        console.log('API: Fetching ${apiUrl}');
        const response = await axiosInstance.get<TenantOut>(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error fetching current tenant details:", error);
        // Consider throwing a more specific error or returning a default/error object
        throw error; // Re-throw to be handled by the component
    }
};

/**
 * Updates the details of the tenant associated with the currently
 * authenticated user. Sends only the changed fields.
 * Calls PATCH /tenants/me
 */
export const updateTenantMe = async (payload: TenantUpdate): Promise<TenantOut> => {
     // Basic check: Don't send empty payload (backend might handle, but good practice)
     if (Object.keys(payload).length === 0) {
         console.warn("API: updateTenantMe called with empty payload. No request sent.");
         // Optionally, fetch and return current data instead of throwing error
         // return fetchTenantMe();
         throw new Error("No changes detected to save."); // Or handle as appropriate
     }

    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/tenants/me`
        console.log(`API: Patching ${apiUrl} with payload:`, payload);
        const response = await axiosInstance.patch<TenantOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error("Error updating current tenant details:", error);
        throw error; // Re-throw to be handled by the component
    }
};

// --- FUTURE USE for Super Admin ---
/**
 * Fetches details for a specific tenant by ID. (Super Admin)
 * Calls GET /tenants/{tenant_id}
 */
export const fetchTenantById = async (tenantId: number): Promise<TenantOut> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/tenants/${tenantId}`
        console.log(`API: Fetching ${apiUrl}`);
        const response = await axiosInstance.get<TenantOut>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching tenant ${tenantId} details:`, error);
        throw error;
    }
};

/**
 * Updates details for a specific tenant by ID. (Super Admin)
 * Calls PATCH /tenants/{tenant_id}
 */
export const updateTenantById = async (tenantId: number, payload: TenantUpdate): Promise<TenantOut> => {
     if (Object.keys(payload).length === 0) {
         console.warn(`API: updateTenantById called with empty payload for ${tenantId}. No request sent.`);
         throw new Error("No changes detected to save.");
     }
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/tenants/${tenantId}`
        console.log(`API: Patching ${apiUrl} with payload:`, payload);
        const response = await axiosInstance.patch<TenantOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error(`Error updating tenant ${tenantId} details:`, error);
        throw error;
    }
};
