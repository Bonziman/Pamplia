// src/components/ProtectedRoute.tsx

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/authContext";

const ProtectedRoute: React.FC = () => {
  // Get isAuthenticated and isLoading from context
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Still loading authentication status? Wait.
  if (isLoading) {
    // Render nothing or a minimal loading indicator
    return <div>Loading...</div>; // Or return null;
  }

  // 2. Loading finished. Is the user authenticated?
  if (!isAuthenticated) {
    // If not authenticated, redirect to login
    console.log("[ProtectedRoute] User not authenticated. Redirecting to /login.");
    return <Navigate to="/login" replace />;
  }

  // 3. Loading finished and user is authenticated. Render the nested route.
  console.log("[ProtectedRoute] User authenticated. Rendering outlet.");
  return <Outlet />;
};

export default ProtectedRoute;
