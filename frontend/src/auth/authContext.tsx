// src/auth/authContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { jwtDecode, JwtPayload } from "jwt-decode";
import axiosInstance from "../api/axiosInstance";

// --- Define Interfaces ---

// Represents the core data extracted directly from the JWT token *AFTER VALIDATION*
// This ensures the required fields are present and correctly typed for your app state.
interface UserFromToken {
  sub: string; // User ID or Email (validated to exist)
  role: string; // User role (validated to exist)
  tenant_id: number; // Tenant ID (validated to exist)
  // Optional standard claims you might want to store after validation
  exp?: number;
  iat?: number;
}

// Represents the detailed user profile fetched from the /profile endpoint
interface UserProfile {
  id: number;
  email: string;
  name: string; // Assuming 'name' is returned by /profile
  role: string;
  tenant_id: number;
  // Add other fields returned by /profile
}

// Represents the *potential* shape decoded from the token *BEFORE VALIDATION*
// Extends JwtPayload (which includes optional 'sub', 'exp', 'iat', etc.)
// Add your custom claims as optional here, as they might be missing before validation.
interface DecodedToken extends JwtPayload {
  role?: string; // Custom claim, potentially missing before check
  tenant_id?: number; // Custom claim, potentially missing before check
}

// Define the shape of the context provided to consumers
interface AuthContextType {
  user: UserFromToken | null; // Stores validated token data
  userProfile: UserProfile | null; // Stores fetched profile data
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// --- Create Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserFromToken | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- Helper function to fetch user profile ---
  const fetchUserProfile = async (): Promise<UserProfile | null> => {
    console.log("Attempting to fetch user profile from /profile");
    try {
      // 1. Construct dynamic URL
      const currentHostname = window.location.hostname; // e.g., "exampletenant.localhost"
      // Assuming backend runs on port 8000 and same hostname
      const apiUrl = `http://${currentHostname}:8000/users/profile`; // Use backend port
      console.log("Fetching profile from:", apiUrl);
  
      // 2. Make the GET request using the dynamic URL
      const response = await axiosInstance.get<UserProfile>(apiUrl);
      console.log("Successfully fetched user profile:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch user profile:", error.response?.data || error.message);
      // Log the full error for more details during debugging
      console.error("Full profile fetch error details:", error.response || error);
      return null;
    }
  };

  // --- Effect for Initial Authentication Check on Mount ---
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      let validUserFromToken: UserFromToken | null = null;
      let fetchedProfile: UserProfile | null = null;
      const storedToken = localStorage.getItem("token");

      if (storedToken) {
        try {
          // Use DecodedToken here - represents potential shape before checks
          const decoded = jwtDecode<DecodedToken>(storedToken);
          const currentTime = Date.now() / 1000;

          // Runtime checks guarantee the types for UserFromToken construction
          if (
            decoded.exp && decoded.exp > currentTime &&
            typeof decoded.sub === 'string' && // This check is crucial
            typeof decoded.role === 'string' &&
            typeof decoded.tenant_id === 'number'
          ) {
            console.log("Stored token is valid, proceeding to fetch profile.");
            // Construct UserFromToken only AFTER validation checks pass
            validUserFromToken = {
              sub: decoded.sub, // TS knows this is string here due to typeof check
              role: decoded.role, // TS knows this is string here
              tenant_id: decoded.tenant_id, // TS knows this is number here
              exp: decoded.exp,
              iat: decoded.iat
            };
            setToken(storedToken);
            fetchedProfile = await fetchUserProfile();
            if (!fetchedProfile) {
                 validUserFromToken = null;
                 localStorage.removeItem("token");
                 setToken(null);
                 console.warn("Profile fetch failed during initialization, clearing session.");
            }
          } else {
            console.log("Stored token expired or invalid (missing claims).");
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Error initializing auth from stored token:", error);
          localStorage.removeItem("token");
        }
      } else {
          console.log("No stored token found.");
      }

      if (isMounted) {
        setUser(validUserFromToken);
        setUserProfile(fetchedProfile);
        setToken(validUserFromToken ? storedToken : null);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Login function ---
  const login = async (newToken: string): Promise<void> => {
    setIsLoading(true);
    let userPayload: UserFromToken | null = null;
    let fetchedProfile: UserProfile | null = null;

    try {
      localStorage.setItem("token", newToken);
      setToken(newToken);

      // Use DecodedToken for the initial decoding
      const decoded = jwtDecode<DecodedToken>(newToken);
      console.log("Decoded User on Login:", decoded);
      const currentTime = Date.now() / 1000;

      // Runtime validation after decoding
      if (
        decoded.exp && decoded.exp > currentTime &&
        typeof decoded.sub === 'string' &&
        typeof decoded.role === 'string' &&
        typeof decoded.tenant_id === 'number'
      ) {
        // Construct the validated UserFromToken object
        userPayload = {
          sub: decoded.sub, // Type known here
          role: decoded.role, // Type known here
          tenant_id: decoded.tenant_id, // Type known here
          exp: decoded.exp,
          iat: decoded.iat
        };

        fetchedProfile = await fetchUserProfile();
        if (!fetchedProfile) {
            throw new Error("Failed to fetch user profile after login.");
        }
      } else {
        throw new Error("Invalid token received after login (missing claims or expired).");
      }

      // Update state only if everything succeeded
      setUser(userPayload);
      setUserProfile(fetchedProfile);

    } catch (error) {
      console.error("Error during login process:", error);
      logout(); // Clear state on error
      throw error; // Re-throw for Login.tsx
    } finally {
        setIsLoading(false);
    }
  };

  // --- Logout function ---
  const logout = () => {
    // ... (logout implementation remains the same) ...
    console.log("Logging out user.");
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setUserProfile(null);
    setIsLoading(false);
  };

  // --- Provide Context Value ---
  return (
    <AuthContext.Provider value={{ user, userProfile, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Hook to access auth context ---
export const useAuth = (): AuthContextType => {
  // ... (useAuth implementation remains the same) ...
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
