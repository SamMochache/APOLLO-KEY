import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

interface RoleProps extends Props {
  role: string;
}

export const ProtectedRoute = ({ children }: Props) => {
  const { user } = useContext<any>(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const RoleProtectedRoute = ({ children, role }: RoleProps) => {
  const { user } = useContext<any>(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};
