import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/admin';

  const handleBack = () => {
    if (isDashboard) {
      navigate('/portal/leadership');
    } else {
      navigate('/admin');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login-4f73b2c');
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-secondary"
            style={{ marginRight: '8px' }}
          >
            {isDashboard ? '← Back to Leadership Dashboard' : '← Back'}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#002B4D' }}>
            {title ?? 'Admin'}
          </h1>
        </div>
        <div className="admin-user-info">
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{user?.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign out
          </button>
        </div>
      </div>
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
