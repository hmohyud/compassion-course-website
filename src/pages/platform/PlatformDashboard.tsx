import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';

const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ marginBottom: '30px', color: '#002B4D' }}>
          Welcome to the Platform
        </h1>
        <p style={{ marginBottom: '40px', color: '#6b7280', fontSize: '18px' }}>
          Hello, {user?.email}. Explore communities, courses, and webcasts.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          marginBottom: '40px'
        }}>
          <Link 
            to="/platform/communities"
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Communities</h2>
            <p style={{ color: '#6b7280' }}>
              Join communities, participate in discussions, and connect with others.
            </p>
          </Link>

          <Link 
            to="/platform/courses"
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Courses</h2>
            <p style={{ color: '#6b7280' }}>
              Browse and enroll in courses to expand your knowledge.
            </p>
          </Link>

          <Link 
            to="/platform/webcasts"
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Webcasts</h2>
            <p style={{ color: '#6b7280' }}>
              Join live webcasts with real-time translation support.
            </p>
          </Link>

          <Link 
            to="/platform/whiteboards"
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
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Whiteboards</h2>
            <p style={{ color: '#6b7280' }}>
              Create whiteboards, draw lines, add sticky notes, and share by email.
            </p>
          </Link>

          <Link 
            to="/platform/profile"
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

export default PlatformDashboard;
