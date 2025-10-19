import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing"; // Landing page
import { AuthContext } from "./context/AuthContext";

function App() {
  const { user } = useContext(AuthContext);

  // Protect routes: only authenticated users
  const PrivateRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" replace />;
  };

  // Protect by role
  const RoleRoute = ({ children, role }) => {
    if (!user) return <Navigate to="/login" replace />;
    return user.role === role ? children : <Navigate to="/dashboard" replace />;
  };

  return (
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Route: any authenticated user */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Role-based Dashboards */}
        <Route
          path="/admin"
          element={
            <RoleRoute role="admin">
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <RoleRoute role="teacher">
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/student"
          element={
            <RoleRoute role="student">
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/parent"
          element={
            <RoleRoute role="parent">
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <RoleRoute role="staff">
              <Dashboard />
            </RoleRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
  );
}

export default App;
