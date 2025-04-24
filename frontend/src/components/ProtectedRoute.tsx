// src/components/ProtectedRoute.tsx

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/authContext";

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth(); // <-- Get isLoading state

  // 1. If still loading the initial auth state, wait.
  //    You can render null, a loading spinner, or a skeleton screen.
  if (isLoading) {
    return <div>Loading authentication...</div>; // Or return null;
  }

  // 2. If loading is finished and there's no user, redirect to login.
  if (!user) {
    return <Navigate to="/login" replace />; // Added 'replace' for better history management
  }

  // 3. If loading is finished and there is a user, allow access.
  return <Outlet />;
};

export default ProtectedRoute;
