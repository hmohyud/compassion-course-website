import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';

const AdminDashboard: React.FC = () => {
  const cardStyle = {
    padding: '24px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textDecoration: 'none' as const,
    color: 'inherit',
    display: 'block' as const,
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  };

  return (
    <AdminLayout title="Admin Dashboard">
      <p style={{ marginBottom: '24px', color: '#6b7280' }}>Welcome to the Compassion Course admin dashboard.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <Link
            to="/admin/users"
            style={cardStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002B4D'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.25rem' }}>User Management</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
              User directory and roles.
            </p>
          </Link>

          <Link
            to="/admin/users?tab=teams&create=1"
            style={cardStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002B4D'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.25rem' }}>Create team</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
              Create a new team and manage teams.
            </p>
          </Link>

          <Link to="/admin/content" style={cardStyle} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002B4D'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.25rem' }}>Content Management</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
              Edit website content, sections, and text dynamically.
            </p>
          </Link>

          <Link to="/admin/role-config" style={cardStyle} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002B4D'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.25rem' }}>User Type Configuration</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
              Configure which rights Leaders and Participants have.
            </p>
          </Link>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
