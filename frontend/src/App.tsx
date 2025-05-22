// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import '@fontsource/inter/index.css';

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/book" element={<BookingPage />} />
            {/* Add other routes as needed */}
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard/*" element={
                <Dashboard />
              }/>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App;
