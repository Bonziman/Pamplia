// src/pages/Login.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/authContext";

// Import the custom input component
import NotchedOutlineInput from '../components/NotchedOutlineInput';

// Keep React Bootstrap components for Button, Spinner if desired (Alert removed)
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
// import Alert from 'react-bootstrap/Alert'; // No longer needed


const Login: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (useEffect and handleLogin logic remain the same) ...
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            console.log("[Login Page] User already authenticated. Redirecting...");
            navigate("/dashboard", { replace: true });
        }
    }, [isLoading, isAuthenticated, navigate]);

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const currentHostname = window.location.hostname;
            const protocol = window.location.protocol;
            const apiUrl = `${protocol}//${currentHostname}:8000/auth/login`;
            console.log("[Login Page] Attempting login to:", apiUrl);

            const response = await axios.post(apiUrl, { email, password }, { withCredentials: true });
            const redirectToSubdomain = response.data.redirect_to_subdomain;
            await checkAuthStatus();

            if (redirectToSubdomain) {
                console.log(`[Login Page] Redirecting to subdomain: ${redirectToSubdomain}`);
                const currentProtocol = window.location.protocol;
                const port = window.location.port;
                const portString = port ? `:${port}` : "";
                const devBaseDomain = "localtest.me";
                const newUrl = `${currentProtocol}//${redirectToSubdomain}.${devBaseDomain}${portString}/dashboard`;
                console.log("[Login Page] Redirecting browser to:", newUrl);
                window.location.href = newUrl;
            } else {
                console.log("[Login Page] Login successful. Navigating to dashboard.");
                navigate("/dashboard");
            }
        } catch (err: any) {
            console.error("[Login Page] Login failed:", err.response || err);
            if (err.response) {
                const status = err.response.status;
                const detail = err.response.data?.detail || "An unexpected error occurred.";
                setError(status === 401 ? "Login failed. Check credentials." : `Login failed: ${detail}`);
            } else if (err.request) {
                setError("Login failed. No response from server.");
            } else {
                setError("Login failed. Setup error.");
            }
            setIsSubmitting(false);
        }
    };


  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (isAuthenticated) { return null; }

  return (
    
    <section className="vh-100">
      
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-6 text-black">
             <div className="px-5 ms-xl-4">
                <i className="fas fa-crow fa-2x me-3 pt-5 mt-xl-4" style={{ color: '#709085' }}></i>
                <span className="h1 fw-bold mb-0">Logo</span>
             </div>

            <div className="d-flex align-items-center h-custom-2 px-5 ms-xl-4 mt-5 pt-5 pt-xl-0 mt-xl-n5">
              <form style={{ width: '23rem' }} onSubmit={handleLogin}>
                <h3 className="fw-normal mb-3 pb-3" style={{ letterSpacing: '1px' }}>Log in</h3>

                {/* --- Error Display: Simple Red Text --- */}
                {error && (
                  <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875em' }}>
                    {error}
                  </div>
                )}

                {/* Email Input */}
                <NotchedOutlineInput
                  id="loginEmail"
                  label="Email address"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="email" // Good practice for login
                  autoFocus // Optional: Focus email field on load
                />

                {/* Password Input - Type set to password triggers toggle */}
                <NotchedOutlineInput
                  id="loginPassword"
                  label="Password"
                  type="password" // This enables the toggle feature
                  name="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password" // Good practice
                />

                {/* Submit Button */}
                <div className="pt-1 mb-4 d-grid">
                  <Button
                    variant="info"
                    size="lg"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>

                {/* Static Links */}
                <p className="small mb-5 pb-lg-2"><a className="text-muted" href="#!">Forgot password?</a></p>
                

              </form>
            </div>
          </div>
          {/* Image column */}
          <div className="col-sm-6 px-0 d-none d-sm-block">
            <img
              src="https://mir-s3-cdn-cf.behance.net/project_modules/source/52ba5a172513857.6480ea0699e71.jpg"
              alt="Login visual"
              className="w-100 vh-100"
              style={{ objectFit: 'cover', objectPosition: 'left' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
