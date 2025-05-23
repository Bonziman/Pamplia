// src/auth/authContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";

// --- Interfaces (remain the same) ---
interface UserFromToken {
  sub: string;
  role: string;
  tenant_id: number;
  exp?: number;
  iat?: number;
}
interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  tenant_id: number;
}
// DecodedToken interface is not needed by the context itself anymore

// --- Context Type ---
interface AuthContextType {
  isAuthenticated: boolean; // Simple flag derived from userProfile
  userProfile: UserProfile | null; // Profile data is now the source of truth
  isLoading: boolean; // Still needed for initial load
  checkAuthStatus: () => Promise<void>; // Renamed login to checkAuthStatus
  logout: () => Promise<void>; // Logout now async
}

interface AuthProviderProps {
  children: ReactNode;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State now focuses on the fetched profile and loading status
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading

  // --- Check Auth Status / Fetch Profile ---
  // useCallback ensures the function identity is stable if passed down
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    console.log("[AuthContext] Checking auth status...");
    setIsLoading(true); // Start loading when checking
    try {
      // Construct dynamic URL for profile endpoint
      const currentHostname = window.location.hostname;
      const apiUrl = `http://${currentHostname}:8000/users/profile`; // Ensure path matches backend router
      console.log("[AuthContext] Fetching profile from:", apiUrl);

      const response = await axiosInstance.get<UserProfile>(apiUrl);
      setUserProfile(response.data); // Set profile on success
      console.log("[AuthContext] User is authenticated.", response.data);
    } catch (error: any) {
      // If /profile returns 401/403 etc., it means not authenticated
      console.log("[AuthContext] User is not authenticated or fetch failed.");
      setUserProfile(null); // Clear profile on failure
    } finally {
      setIsLoading(false); // Stop loading once check is complete
    }
  }, []); // Empty dependency array for useCallback

  // --- Initial Check on Mount ---
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]); // Run checkAuthStatus on mount

  // --- Logout Function ---
  const logout = async (): Promise<void> => {
    console.log("[AuthContext] Attempting logout...");
    setIsLoading(true);
    try {
      // Construct dynamic URL for logout endpoint
      const currentHostname = window.location.hostname;
      // Use base domain or current? Usually safe to call on current.
      const apiUrl = `http://${currentHostname}:8000/auth/logout`;
      await axiosInstance.post(apiUrl); // Call backend to clear cookie
      console.log("[AuthContext] Logout API call successful.");
    } catch (error: any) {
      console.error("[AuthContext] Logout API call failed:", error.response?.data || error.message);
      // Proceed with client-side state clearing even if API fails
    } finally {
      setUserProfile(null); // Clear profile state
      setIsLoading(false);
      console.log("[AuthContext] Client-side state cleared.");
      // Redirect happens in the component calling logout
    }
  };

  // Derived state for convenience
  const isAuthenticated = !!userProfile;

  // --- Provide Context Value ---
  return (
    <AuthContext.Provider value={{ isAuthenticated, userProfile, isLoading, checkAuthStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Hook to access auth context ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
