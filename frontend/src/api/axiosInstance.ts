// src/api/axiosInstance.ts

import axios from "axios";

const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',  
  },
});

// Add Authorization header if token exists
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
