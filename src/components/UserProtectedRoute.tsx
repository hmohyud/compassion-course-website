import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/userProfileService';

interface UserProtectedRouteProps {
  children: React.ReactNode;
  /** When true, skip the must-change-password redirect (e.g. for the change-password page itself) */
  skipMustChangePasswordCheck?: boolean;
}

const UserProtectedRoute: React.FC<UserProtectedRouteProps> = ({ children, skipMustChangePasswordCheck }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || skipMustChangePasswordCheck) {
      setMustChangePassword(null);
      return;
    }
    let cancelled = false;
    getUserProfile(user.uid).then((profile) => {
      if (!cancelled && profile?.mustChangePassword === true) {
        setMustChangePassword(true);
      } else if (!cancelled) {
        setMustChangePassword(false);
      }
    }).catch(() => {
      if (!cancelled) setMustChangePassword(false);
    });
    return () => { cancelled = true; };
  }, [user, skipMustChangePasswordCheck]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (skipMustChangePasswordCheck) {
    return <>{children}</>;
  }

  if (mustChangePassword === true) {
    return <Navigate to="/change-password" replace />;
  }

  if (mustChangePassword === null) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default UserProtectedRoute;
