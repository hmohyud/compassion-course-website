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
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginTop: '30px'
          }}>
            <Link 
              to="/portal/circle"
              style={{
                padding: '30px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: '#111827',
                display: 'block',
                border: '2px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>The Global Compassion Network</h2>
              <p style={{ color: '#6b7280' }}>
                Connect and grow with fellow participants.
              </p>
            </Link>

            <Link 
              to="/portal/university"
              style={{
                padding: '30px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: '#111827',
                display: 'block',
                border: '2px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Compassion Course University</h2>
              <p style={{ color: '#6b7280' }}>
                Courses, webcasts, whiteboards, profile, and progress.
              </p>
            </Link>
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
