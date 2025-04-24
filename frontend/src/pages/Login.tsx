// src/pages/Login.tsx
import React, { useState, useEffect } from "react"; // Add useEffect
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Keep using axios directly for login call if preferred
import { useAuth } from "../auth/authContext";

const Login: React.FC = () => {
  // Get auth status and loading state
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submit

  // --- Redirect if already logged in ---
  useEffect(() => {
    // Only redirect if auth is not loading and user is authenticated
    if (!isLoading && isAuthenticated) {
      console.log("[Login Page] User already authenticated. Redirecting to dashboard...");
      // Optional: Show a brief message
      // alert("You are already logged in. Redirecting...");
      navigate("/dashboard", { replace: true }); // Replace history entry
    }
  }, [isLoading, isAuthenticated, navigate]);


  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true); // Disable button

    try {
      const currentHostname = window.location.hostname;
      const apiUrl = `http://${currentHostname}:8000/auth/login`;
      console.log("[Login Page] Attempting login to:", apiUrl);

      // Make API call - cookies are handled automatically by browser + backend response
      const response = await axios.post(apiUrl, {
        email,
        password,
      }, { withCredentials: true }); // Ensure credentials are sent if using axios directly

      // Check response data for redirect signal
      const redirectToSubdomain = response.data.redirect_to_subdomain;

      // IMPORTANT: Re-check auth status AFTER successful login API call
      // This allows AuthProvider to fetch profile using the NEW cookie
      await checkAuthStatus(); // Wait for profile fetch to complete

      // Now perform navigation/redirect based on API response
      if (redirectToSubdomain) {
        console.log(`[Login Page] Redirecting to subdomain: ${redirectToSubdomain}`);

        const protocol = window.location.protocol; // "http:" or "https:"
        const port = window.location.port; // "3000" (frontend port)
        const portString = port ? `:${port}` : "";
        // --- Define the known base domain for development ---
        const devBaseDomain = "localtest.me"; // Use the correct base domain

        // Construct the new URL using the known base domain
        const newUrl = `${protocol}//${redirectToSubdomain}.${devBaseDomain}${portString}/dashboard`;

        console.log("[Login Page] Redirecting browser to:", newUrl);
        window.location.href = newUrl; // Perform full browser redirect

      } else {
        // Login successful on correct subdomain
        console.log("[Login Page] Login successful on correct subdomain. Navigating to dashboard.");
        navigate("/dashboard"); // Client-side navigation
      }

    } catch (err: any) {
      console.error("[Login Page] Login failed:", err.response || err);
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || "An unexpected error occurred.";
        if (status === 401) {
          setError("Login failed. Please check your credentials.");
        } else if (status === 500) {
          setError("Login failed due to a server configuration issue.");
        } else {
          setError(`Login failed: ${detail}`);
        }
      } else {
        setError("Login failed. Could not connect to server.");
      }
      setIsSubmitting(false); // Re-enable button on error
    }
    // No finally block for setIsSubmitting=false, because success causes navigation/redirect
  };

  // Render loading or null while checking auth state initially
  if (isLoading) {
    return <div>Loading...</div>;
  }
  // If already authenticated, the useEffect above will handle the redirect.
  // We might render null briefly before the redirect happens.
  if (isAuthenticated) {
      return null; // Or a minimal "Redirecting..." message
  }

  // Render login form only if not loading and not authenticated
  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        {error && <div style={{ color: "red", marginTop: '10px' }}>{error}</div>}
        <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
