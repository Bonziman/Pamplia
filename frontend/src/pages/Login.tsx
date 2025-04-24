// src/pages/Login.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/authContext";

const Login: React.FC = () => {
  const { login } = useAuth(); // Get the login function from context
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); // Clear previous errors

    try {
      // 1. Construct the dynamic API URL (works for base or subdomain)
      const currentHostname = window.location.hostname; // e.g., "localhost" or "exampletenant.localhost"
      const apiUrl = `http://${currentHostname}:8000/auth/login`; // Use backend port
      console.log("Attempting login to:", apiUrl);

      // 2. Make the API call
      const response = await axios.post(apiUrl, {
        email,
        password,
      });

      // 3. Get data from response (check BOTH token and potential redirect)
      const accessToken = response.data.access_token;
      const redirectToSubdomain = response.data.redirect_to_subdomain;

      if (!accessToken) {
         throw new Error("Access token not found in response");
      }

      // 4. IMPORTANT: Update Auth Context and Local Storage FIRST
      login(accessToken);

      // 5. Handle navigation/redirection
      if (redirectToSubdomain) {
          // --- Redirect to Tenant Subdomain ---
          console.log(`Redirecting to subdomain: ${redirectToSubdomain}`);

          const protocol = window.location.protocol; // "http:" or "https:"
          const port = window.location.port; // e.g., "3000" (frontend port)
          const portString = port ? `:${port}` : "";

          // Extract base domain (e.g., ".localhost", ".app.com")
          // This assumes at least one dot exists if it's not just "localhost"
          const parts = currentHostname.split('.');
          let baseDomain = "localhost"; // Default for simple localhost
          if (parts.length > 1) {
              baseDomain = parts.slice(1).join('.'); // e.g., "localhost" from "app.localhost"
          }

          // Construct the new URL targeting the frontend on the correct subdomain
          const newUrl = `${protocol}//${redirectToSubdomain}.${baseDomain}${portString}/dashboard`; // Redirect to dashboard path

          console.log("Redirecting browser to:", newUrl);
          // Perform full browser redirect
          window.location.href = newUrl;

      } else {
          // --- Navigate Client-Side (Already on correct subdomain) ---
          console.log("Login successful on correct subdomain. Navigating to dashboard.");
          navigate("/dashboard");
      }

    } catch (err: any) {
      console.error("Login failed:", err.response || err);
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || "An unexpected error occurred.";
        // Backend now uses 401 for all credential/tenant errors from user perspective
        if (status === 401) {
          setError("Login failed. Please check your credentials.");
        } else if (status === 500) {
          // Handle the internal configuration error
          setError("Login failed due to a server configuration issue.");
        } else {
           // Handle other potential errors (like the old 400 if needed, though less likely now)
          setError(`Login failed: ${detail}`);
        }
      } else {
        setError("Login failed. Could not connect to server.");
      }
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        {/* Form inputs remain the same */}
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div style={{ color: "red", marginTop: '10px' }}>{error}</div>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
