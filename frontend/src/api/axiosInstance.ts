// src/api/axiosInstance.ts
import axios from "axios";

const axiosInstance = axios.create({
  // No baseURL needed if using dynamic URLs
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // <-- Add this to send cookies
});

// Remove the interceptor that manually added the Authorization header
/*
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // No longer using localStorage
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
*/

export default axiosInstance;
