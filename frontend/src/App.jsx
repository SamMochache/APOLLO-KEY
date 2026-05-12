import React, { useContext, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Unauthorized from "./pages/Unauthorized";
import DashboardLayout from "./components/DashboardLayout";
import { AuthContext } from "./context/AuthContext";
import { ProtectedRoute, RoleProtectedRoute } from "./components/ProtectedRoute";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminManagement = lazy(() => import("./pages/AdminManagement"));
const TimetableBuilder = lazy(() => import("./pages/TimetableBuilder"));
const TimetableDashboard = lazy(() => import("./pages/TimetableDashboard"));
const AttendanceDashboard = lazy(() => import("./pages/AttendanceDashboard"));
const AttendanceRecorder = lazy(() => import("./pages/AttendanceRecorder"));
const AttendanceRankings = lazy(() => import("./pages/AttendanceRankings"));
const GradeEntry = lazy(() => import("./pages/GradeEntry"));
const GradeAnalytics = lazy(() => import("./pages/GradeAnalytics"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const StudentAnalytics = lazy(() => import("./pages/StudentAnalytics"));
const MessagesInbox = lazy(() => import("./pages/MessagesInbox"));

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/academics" element={<AdminManagement />} />
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/attendance/record" element={<AttendanceRecorder />} />
            <Route path="/attendance/rankings" element={<AttendanceRankings />} />
            <Route path="/grades/entry" element={<GradeEntry />} />
            <Route path="/grades/analytics" element={<GradeAnalytics />} />
            <Route path="/analytics/performance" element={<StudentAnalytics />} />
            <Route path="/messages" element={<MessagesInbox />} />
            <Route path="/timetable" element={<TimetableDashboard />} />
            <Route path="/timetable/builder" element={<TimetableBuilder />} />
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

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
