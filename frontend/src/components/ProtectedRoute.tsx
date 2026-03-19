import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" state={{ from: location, needLogin: true }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
