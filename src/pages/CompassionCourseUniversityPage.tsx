import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

const cardStyle = {
  padding: '30px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block',
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const CompassionCourseUniversityPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { role, isAdmin } = usePermissions();
  const navigate = useNavigate();

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
      <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Link
          to="/portal"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Portal
        </Link>
        <h1 style={{ fontSize: '2.5rem', color: '#002B4D', marginBottom: '10px' }}>
          Compassion Course University
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.2rem', marginBottom: '30px' }}>
          Courses and profile.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Courses</h2>
            <p style={{ color: '#6b7280' }}>
              Browse and enroll in courses to expand your knowledge.
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Events</h2>
            <p style={{ color: '#6b7280' }}>
              View upcoming events and sessions.
            </p>
          </Link>

          {(isAdmin || role === 'leader') && (
            <Link
              to="/portal/backlog"
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
              <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Project backlog</h2>
              <p style={{ color: '#6b7280' }}>
                View and manage the Compassion Course backlog.
              </p>
            </Link>
          )}

          {role === 'participant' && (
            <Link
              to="/platform/resources"
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
              <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Participants</h2>
              <p style={{ color: '#6b7280' }}>
                Videos, whiteboards, Meet, Docs, and Drive shared with your email.
              </p>
            </Link>
          )}

          <Link
            to="/platform/profile"
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>My Profile</h2>
            <p style={{ color: '#6b7280' }}>
              Manage your profile and account settings.
            </p>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default CompassionCourseUniversityPage;
