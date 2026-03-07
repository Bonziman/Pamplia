// src/api/tenantApi.ts
// --- NEW FILE or Add to existing ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
import { buildApiUrl } from './apiBase';
import { TenantOut, TenantUpdate, TenantPaymentRecord, TenantPaymentRecordCreate } from '../types/tenants';


/**
 * Fetches the details of the tenant associated with the currently
 * authenticated user.
 * Calls GET /tenants/me
 */
export const fetchTenantMe = async (): Promise<TenantOut> => {
    try {
        const apiUrl = buildApiUrl("/tenants/me");
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
        const apiUrl = buildApiUrl("/tenants/me");
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
        const apiUrl = buildApiUrl(`/tenants/${tenantId}`);
        console.log(`API: Fetching ${apiUrl}`);
        const response = await axiosInstance.get<TenantOut>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching tenant ${tenantId} details:`, error);
        throw error;
    }
};

// --- Super Admin: List all tenants ---
export const fetchTenants = async (): Promise<TenantOut[]> => {
    try {
        const apiUrl = buildApiUrl("/tenants/");
        const response = await axiosInstance.get<TenantOut[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error fetching tenants:", error);
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
        const apiUrl = buildApiUrl(`/tenants/${tenantId}`);
        console.log(`API: Patching ${apiUrl} with payload:`, payload);
        const response = await axiosInstance.patch<TenantOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error(`Error updating tenant ${tenantId} details:`, error);
        throw error;
    }
};

export const createTenant = async (payload: { name: string; subdomain: string }): Promise<TenantOut> => {
    try {
        const apiUrl = buildApiUrl("/tenants/");
        const response = await axiosInstance.post<TenantOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error("Error creating tenant:", error);
        throw error;
    }
};

export type TenantStats = {
    tenant_id: number;
    revenue_total: number;
    revenue_last_30_days: number;
    appointments_total: number;
    clients_total: number;
    services_total: number;
    users_total: number;
    admins_total: number;
    staff_total: number;
    last_appointment_at: string | null;
};

export const fetchTenantStats = async (tenantId: number): Promise<TenantStats> => {
    try {
        const apiUrl = buildApiUrl(`/tenants/${tenantId}/stats`);
        const response = await axiosInstance.get<TenantStats>(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error fetching tenant stats:", error);
        throw error;
    }
};

export const fetchTenantPayments = async (tenantId: number, limit = 20): Promise<TenantPaymentRecord[]> => {
    const apiUrl = buildApiUrl(`/tenants/${tenantId}/payments`);
    const response = await axiosInstance.get<TenantPaymentRecord[]>(apiUrl, {
        params: { limit }
    });
    return response.data;
};

export const createTenantPayment = async (
    tenantId: number,
    payload: TenantPaymentRecordCreate
): Promise<TenantPaymentRecord> => {
    const apiUrl = buildApiUrl(`/tenants/${tenantId}/payments`);
    const response = await axiosInstance.post<TenantPaymentRecord>(apiUrl, payload);
    return response.data;
};

export type ExpireOverdueTenantsResult = {
    checked_at: string;
    updated_count: number;
    message: string;
};

export const expireOverdueTenants = async (): Promise<ExpireOverdueTenantsResult> => {
    const apiUrl = buildApiUrl('/tenants/billing/expire-overdue');
    const response = await axiosInstance.post<ExpireOverdueTenantsResult>(apiUrl);
    return response.data;
};
