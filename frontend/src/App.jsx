import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Unauthorized from "./pages/Unauthorized";
import DashboardLayout from "./components/DashboardLayout"; // ✅ new layout
import { AuthContext } from "./context/AuthContext";
import { ProtectedRoute, RoleProtectedRoute } from "./components/ProtectedRoute";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes wrapped with DashboardLayout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute role="admin">
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <RoleProtectedRoute role="teacher">
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <RoleProtectedRoute role="student">
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/parent"
            element={
              <RoleProtectedRoute role="parent">
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <RoleProtectedRoute role="staff">
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
        </Route>

        {/* Unauthorized page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Catch-all route */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
