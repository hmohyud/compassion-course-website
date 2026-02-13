import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

const cardStyle = {
  padding: '15px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block' as const,
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const PortalPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { role } = usePermissions();
  const navigate = useNavigate();
  const showLeadership = role === 'manager' || role === 'admin';

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
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '26px', color: '#002B4D', marginBottom: '10px' }}>
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
          <h2 style={{ color: '#002B4D', marginBottom: '20px', fontSize: '22px' }}>Your Portal</h2>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>
            Welcome to your Compassion Course portal. Here you can access your course materials, 
            track your progress, and connect with the community.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '10px',
            marginTop: '15px'
          }}>
            <Link 
              to="/portal/circle"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Global Compassion Network</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Connect and grow with fellow participants.
              </p>
            </Link>

            <Link 
              to="/portal/library"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Library</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Browse resources and materials.
              </p>
            </Link>

            <Link 
              to="/platform/events"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Events</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                View upcoming events and sessions.
              </p>
            </Link>

            <Link 
              to="/platform/courses"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Courses</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Browse and enroll in courses.
              </p>
            </Link>

            {showLeadership && (
              <Link 
                to="/portal/leadership"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Leadership Portal</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Tools and resources for leaders.
                </p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PortalPage;
