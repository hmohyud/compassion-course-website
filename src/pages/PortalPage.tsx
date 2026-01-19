import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

const PortalPage: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
    navigate('/login');
    return null;
  }

  return (
    <Layout>
      <div className="portal-page" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#002B4D', marginBottom: '10px' }}>
            Welcome to the Compassion Course Portal
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
            Hello, {user.email}
          </p>
        </div>

        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '40px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>Your Portal</h2>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>
            Welcome to your Compassion Course portal. Here you can access your course materials, 
            track your progress, and connect with the community.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginTop: '30px'
          }}>
            <a 
              href="/platform"
              style={{ 
                padding: '20px', 
                background: '#f9fafb', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <h3 style={{ color: '#002B4D', marginBottom: '10px' }}>Platform</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Access communities, courses, and webcasts
              </p>
            </a>
            
            <Link 
              to="/portal/circle"
              style={{ 
                padding: '20px', 
                background: '#f9fafb', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <h3 style={{ color: '#002B4D', marginBottom: '10px' }}>Circle Community</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Connect, learn, and grow with fellow participants
              </p>
            </Link>
            
            <div style={{ 
              padding: '20px', 
              background: '#f9fafb', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ color: '#002B4D', marginBottom: '10px' }}>Progress Tracking</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                View your learning progress and achievements
              </p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ 
              padding: '12px 24px', 
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default PortalPage;
