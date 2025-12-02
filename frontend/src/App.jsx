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
import AdminManagement from "./pages/AdminManagement";
import TimetableBuilder from "./pages/TimetableBuilder";
import TimetableDashboard from "./pages/TimetableDashboard";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import AttendanceRecorder from "./pages/AttendanceRecorder";
import AttendanceRankings from "./pages/AttendanceRankings";  
import GradeEntry from "./pages/GradeEntry"
import GradeAnalytics from "./pages/GradeAnalytics";
import ParentDashboard from "./pages/ParentDashboard";
import StudentAnalytics from "./pages/StudentAnalytics";
import MessagesInbox from "./pages/MessagesInbox";

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
          
          {/* 📚 Academic Management - Unified Route */}
          <Route path="/academics" element={<AdminManagement />} />
          <Route path="/attendance" element={<AttendanceDashboard />} />
          <Route path="/attendance/record" element={<AttendanceRecorder />} />
          <Route path="/attendance/rankings" element={<AttendanceRankings />} /> {/* NEW ROUTE */}
          <Route path="/grades/entry" element={<GradeEntry />} />
          <Route path="/grades/analytics" element={<GradeAnalytics />} />
          <Route path="/analytics/performance" element={<StudentAnalytics />} />
          <Route path="/messages" element={<MessagesInbox />} />


  
          {/* 🕓 Timetable Routes */}
          <Route path="/timetable" element={<TimetableDashboard />} />
          <Route path="/timetable/builder" element={<TimetableBuilder />} />

          {/* 🎯 Role-based Dashboard Routes */}
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
            path="/parent-portal"
            element={
              <RoleProtectedRoute role="parent">
                <ParentDashboard />
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