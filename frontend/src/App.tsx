/**
 * Main App Component
 * Root routing and provider setup
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { useAuth } from '@hooks';

// Components
import { ErrorBoundary, ProtectedRoute } from '@components/common';
import { DashboardLayout } from '@components/layouts/DashboardLayout';
import { ToastContainer } from '@components/ui';

// Pages
import LandingPage from '@pages/LandingPage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import DashboardPage from '@pages/DashboardPage';
import UnauthorizedPage from '@pages/UnauthorizedPage';
import PlaceholderPage from '@pages/PlaceholderPage';

export const App: React.FC = () => {
  const { getCurrentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      getCurrentUser();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Academics & Management */}
              <Route path="/academics" element={<PlaceholderPage title="Academics Management" />} />
              
              {/* Attendance Routes */}
              <Route path="/attendance" element={<PlaceholderPage title="Attendance Dashboard" />} />
              <Route path="/attendance/record" element={<PlaceholderPage title="Record Attendance" />} />
              <Route path="/attendance/rankings" element={<PlaceholderPage title="Attendance Rankings" />} />
              
              {/* Grade Routes */}
              <Route path="/grades/entry" element={<PlaceholderPage title="Grade Entry" />} />
              <Route path="/grades/analytics" element={<PlaceholderPage title="Grade Analytics" />} />
              
              {/* Analytics Routes */}
              <Route path="/analytics/performance" element={<PlaceholderPage title="Performance Analytics" />} />
              
              {/* Messaging */}
              <Route path="/messages" element={<PlaceholderPage title="Messages" />} />
              
              {/* Timetable Routes */}
              <Route path="/timetable" element={<PlaceholderPage title="Timetable" />} />
              <Route path="/timetable/builder" element={<PlaceholderPage title="Timetable Builder" />} />
              
              {/* User Routes */}
              <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <PlaceholderPage title="Admin Dashboard" />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global Toast Container */}
          <ToastContainer />
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
