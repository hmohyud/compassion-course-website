import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { Link, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';

const PortalPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { role, isAdmin } = usePermissions();
  const showLeadership = role === 'manager' || role === 'admin' || isAdmin;

  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'there';

  return (
    <Layout>
      <div className="portal-page">
        <div className="portal-header">
          <h1 className="portal-greeting">Welcome back, {displayName}</h1>
          <p className="portal-subtitle">
            Your home base for connecting, learning, and leading.
          </p>
        </div>

        <div className="portal-grid">
          <Link to="/portal/circle" className="portal-card">
            <div className="portal-card-icon portal-card-icon--community">
              <i className="fas fa-globe-americas"></i>
            </div>
            <div className="portal-card-content">
              <h3>Global Compassion Network</h3>
              <p>Connect and grow with fellow participants from around the world.</p>
            </div>
            <span className="portal-card-arrow"><i className="fas fa-arrow-right"></i></span>
          </Link>

          <Link to="/portal/library" className="portal-card">
            <div className="portal-card-icon portal-card-icon--library">
              <i className="fas fa-book"></i>
            </div>
            <div className="portal-card-content">
              <h3>Library</h3>
              <p>Browse resources, materials, and reference guides.</p>
            </div>
            <span className="portal-card-arrow"><i className="fas fa-arrow-right"></i></span>
          </Link>

          {showLeadership && (
            <Link to="/portal/leadership" className="portal-card portal-card--leadership">
              <div className="portal-card-icon portal-card-icon--leadership">
                <i className="fas fa-users-cog"></i>
              </div>
              <div className="portal-card-content">
                <h3>Leadership Dashboard</h3>
                <p>Manage teams, boards, and organizational tools.</p>
              </div>
              <span className="portal-card-arrow"><i className="fas fa-arrow-right"></i></span>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PortalPage;
