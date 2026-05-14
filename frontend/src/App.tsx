// src/App.tsx

import React from "react";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/authContext";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import DashboardRefactored from "./pages/DashboardRefactored";
import LandingPage from "./pages/LandingPage";
import DemoPage from "./pages/DemoPage";
import ProtectedRoute from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage"; 
import AcceptInvitationPage from "./pages/public/AcceptInvitationPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import '@fontsource/inter/index.css';
import { LanguageProvider } from './i18n/languageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s — data stays fresh, no background refetch
      gcTime: 5 * 60_000,       // 5min — keep cache after unmount
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
                <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/book" element={<BookingPage />} />
                <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard/*" element={
                  <DashboardRefactored />
                  }/>
                </Route>
                </Routes>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

export default App;
