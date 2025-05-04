// src/api/templateApi.ts
// --- NEW FILE ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
// Import Template types from your types definition file
import { TemplateOut, TemplateCreatePayload, TemplateUpdatePayload } from '../types/Template'; // Adjust path as needed



/**
 * Fetches all templates for the current tenant.
 * Calls GET /templates/
 */
export const fetchTemplates = async (): Promise<TemplateOut[]> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/templates/`;
        console.log(`API: Fetching ${apiUrl}`);
        const response = await axiosInstance.get<TemplateOut[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error fetching templates:", error);
        throw error; // Re-throw for component handling
    }
};

/**
 * Fetches a single template by its ID.
 * Calls GET /templates/{templateId}
 */
export const fetchTemplateById = async (templateId: number): Promise<TemplateOut> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/templates/${templateId}`;
        console.log(`API: Fetching ${apiUrl}`);
        const response = await axiosInstance.get<TemplateOut>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching template ${templateId}:`, error);
        throw error;
    }
};

/**
 * Creates a new template for the current tenant.
 * Calls POST /templates/
 */
export const createTemplate = async (payload: TemplateCreatePayload): Promise<TemplateOut> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/templates/`;
        console.log(`API: Creating template at ${apiUrl} with payload:`, payload);
        const response = await axiosInstance.post<TemplateOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error("Error creating template:", error);
        throw error;
    }
};

/**
 * Updates an existing template. Sends only changed fields potentially.
 * Calls PATCH /templates/{templateId}
 */
export const updateTemplate = async (templateId: number, payload: TemplateUpdatePayload): Promise<TemplateOut> => {
    // Ensure payload isn't empty if PATCH expects at least one field
     if (Object.keys(payload).length === 0) {
         console.warn(`API: updateTemplate called with empty payload for ${templateId}.`);
         // Depending on backend, this might be an error or just do nothing.
         // Consider fetching current data or throwing an error here.
         // For now, let the backend handle it or potentially throw.
         // throw new Error("No changes detected to save.");
     }
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/templates/${templateId}`;
        console.log(`API: Updating template at ${apiUrl} with payload:`, payload);
        const response = await axiosInstance.patch<TemplateOut>(apiUrl, payload);
        return response.data;
    } catch (error) {
        console.error(`Error updating template ${templateId}:`, error);
        throw error;
    }
};

/**
 * Deletes a template by its ID.
 * Calls DELETE /templates/{templateId}
 */
export const deleteTemplate = async (templateId: number): Promise<void> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/templates/${templateId}`;
        // Assuming the backend returns 204 No Content on successful deletion
        // Adjust the URL as per your backend API
        console.log(`API: Deleting template at ${apiUrl}`);
        await axiosInstance.delete(apiUrl);
        // No response body expected for 204 No Content
    } catch (error) {
        console.error(`Error deleting template ${templateId}:`, error);
        throw error;
    }
};
