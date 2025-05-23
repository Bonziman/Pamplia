// src/api/userApi.ts
import axios from "axios"; // <--- Import the main axios object
import axiosInstance from "./axiosInstance"; // Keep your configured instance

// Define the FetchedUser type
export interface FetchedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
}


export const fetchUsers = async (): Promise<FetchedUser[]> => {
  try {
    // Construct the full dynamic URL targeting the backend port (8000)
    const currentHostname = window.location.hostname;
    const apiUrl = `http://${currentHostname}:8000/users/`; // Use backend port 8000
    console.log("Fetching users list from API URL:", apiUrl);

    // Use axiosInstance to make the request (sends cookies)
    const response = await axiosInstance.get<FetchedUser[]>(apiUrl);
    console.log('Raw fetchUsers response.data:', response.data);
    return response.data;
  } catch (error) { // error is initially 'unknown'
    console.error("Error fetching users:", error);

    // --- Type Check for Axios Error ---
    // Use the main 'axios.isAxiosError' helper
    if (axios.isAxiosError(error)) {
        // Now TypeScript knows 'error' is an AxiosError inside this block
        console.error("Axios error details:", error.message);
        if (error.response) {
            // Check if response exists
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received:", error.request);
        }
    } else {
        // Handle non-Axios errors (e.g., network issues, JS errors)
        console.error("Non-Axios error:", error);
    }

    throw error; // Re-throw the original error after logging
  }
};

export const updateUser = async (id: number, userData: Partial<FetchedUser>): Promise<FetchedUser> => {
  try {
    const currentHostname = window.location.hostname;
    const apiUrl = `http://${currentHostname}:8000/users/${id}/`; // Assuming a RESTful endpoint for updates
    console.log(`Updating user ${id} at API URL:`, apiUrl);

    // Use axiosInstance.put or axiosInstance.patch for updates
    // PATCH is generally preferred for partial updates
    const response = await axiosInstance.patch<FetchedUser>(apiUrl, userData);

    return response.data;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);

    if (axios.isAxiosError(error)) {
        console.error("Axios error details:", error.message);
        if (error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        } else if (error.request) {
            console.error("No response received:", error.request);
        }
    } else {
        console.error("Non-Axios error:", error);
    }

    throw error; // Re-throw the original error after logging
  }
};
