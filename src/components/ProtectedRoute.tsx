import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    console.log('[Admin Portal gate] redirect to login: isAdmin', isAdmin, 'loading', loading, 'currentUser?.uid', user?.uid);
    return <Navigate to="/admin/login-4f73b2c" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
