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

// Response interceptor: handle 401 (session expired) by redirecting to /login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on public pages or login itself
      const publicPaths = ['/login', '/accept-invitation', '/book', '/forgot-password'];
      const currentPath = window.location.pathname;
      const isPublicPage = publicPaths.some(p => currentPath.startsWith(p));
      if (!isPublicPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
