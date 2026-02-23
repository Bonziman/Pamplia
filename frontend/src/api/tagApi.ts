// src/api/tagApi.ts
// --- NEW FILE ---

import axios from './axiosInstance'; // Your authenticated axios instance
import { buildApiUrl } from './apiBase';

// --- Type Definitions (Match schemas/tag.py) ---

export interface FetchedTag {
    id: number;
    tenant_id: number;
    tag_name: string;
    color_hex?: string | null;
    icon_identifier?: string | null;
}

export interface TagCreatePayload {
    tag_name: string;
    color_hex?: string;
    icon_identifier?: string;
    // tenant_id is handled by backend context
}

export interface TagUpdatePayload {
    tag_name?: string;
    color_hex?: string;
    icon_identifier?: string;
}

// --- API Functions ---

/**
 * Fetches tags accessible by the currently authenticated user (for their tenant).
 * Calls the backend endpoint: GET /tags
 */
export const fetchTags = async (): Promise<FetchedTag[]> => {
    try {
        const apiUrl = buildApiUrl("/tags/");
        
        const params = {
            skip: 0,
            limit: 500, // Increased limit for fetching all tags for a dropdown
        };
        console.log("Fetching tags from: /tags with params:", params);
        const response = await axios.get<FetchedTag[]>(apiUrl, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching tags:`, error);
        throw error;
    }
};

/**
 * Creates a new tag. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: POST /tags
 */
export const createTag = async (payload: TagCreatePayload): Promise<FetchedTag> => {
     try {
                const apiUrl = buildApiUrl("/tags/");
        console.log("Creating tag:", payload);
        const response = await axios.post<FetchedTag>(apiUrl, payload);
        return response.data;
     } catch(error) {
        console.error("Error creating tag:", error);
        throw error;
     }
};

/**
 * Updates an existing tag. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: PATCH /tags/{tagId}
 */
export const updateTag = async (tagId: number, payload: TagUpdatePayload): Promise<FetchedTag> => {
     try {
        const apiUrl = buildApiUrl(`/tags/${tagId}`);
        const response = await axios.patch<FetchedTag>(apiUrl, payload);
        return response.data;
     } catch(error) {
        console.error(`Error updating tag ${tagId}:`, error);
        throw error;
     }
};

/**
 * Deletes a tag. Requires Staff, Admin or Super Admin role.
 * Calls the backend endpoint: DELETE /tags/{tagId}
 */
export const deleteTag = async (tagId: number): Promise<void> => {
     try {
        const apiUrl = buildApiUrl(`/tags/${tagId}`);
        await axios.delete(apiUrl);
     } catch(error) {
        console.error(`Error deleting tag ${tagId}:`, error);
        throw error;
     }
};
