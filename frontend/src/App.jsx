import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Unauthorized from "./pages/Unauthorized";
import DashboardLayout from "./components/DashboardLayout";
import { AuthContext } from "./context/AuthContext";
import { ProtectedRoute, RoleProtectedRoute } from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ClassDashboard from "./pages/ClassDashboard";
import SubjectDashboard from "./pages/SubjectDashboard";
import TimetableBuilder from "./pages/TimetableBuilder";
import TimetableDashboard from "./pages/TimetableDashboard";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* 🌍 Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
  
        {/* 🔒 Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/classes" element={<ClassDashboard />} />
          <Route path="/subjects" element={<SubjectDashboard />} />
          <Route path="/timetable" element={<TimetableDashboard />} />
          <Route path="/timetable/builder" element={<TimetableBuilder />} />

          {/* 🎯 Role-based routes */}
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

        {/* 🚫 Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 🧭 Catch-all */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;