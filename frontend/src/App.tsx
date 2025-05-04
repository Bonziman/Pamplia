// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage";
import ClientProfilePage from "./pages/ClientProfilePage";

const App: React.FC = () => {
  return (
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
  );
};

export default App;
