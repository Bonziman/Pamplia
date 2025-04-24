// src/api/userApi.ts
import axios from "axios";
// import { API_BASE_URL } from "./config"; // Assuming you have a config file for base URL

export const fetchUsers = async (token: string) => {
  try {
    const response = await axios.get(`http://127.0.0.1:8000/users/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data; // Return the users data
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};
