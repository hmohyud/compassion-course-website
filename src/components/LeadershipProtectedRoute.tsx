import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import UserProtectedRoute from './UserProtectedRoute';

interface LeadershipProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Restricts access to leadership portal routes: only manager, admin (portal role), or platform admin (isAdmin).
 */
const LeadershipProtectedRoute: React.FC<LeadershipProtectedRouteProps> = ({ children }) => {
  const { role, isAdmin, loading } = usePermissions();
  const allowed = role === 'manager' || role === 'admin' || isAdmin;

  return (
    <UserProtectedRoute>
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : allowed ? (
        children
      ) : (
        <Navigate to="/unauthorized" replace />
      )}
    </UserProtectedRoute>
  );
};

export default LeadershipProtectedRoute;
