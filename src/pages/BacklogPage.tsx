import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const BACKLOG_URL = import.meta.env.VITE_BACKLOG_URL || 'https://thatagileapp.com/the-compassion-course';

const BacklogPage: React.FC = () => {
  return (
    <Layout hideNavigation>
      <div style={{
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Branded Header */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px 12px 0 0',
          padding: '24px 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              color: '#002B4D',
              margin: 0,
              fontWeight: 600
            }}>
              Compassion Course Backlog
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '4px 0 0 0',
              fontSize: '0.95rem'
            }}>
              View and manage the Compassion Course backlog
            </p>
          </div>
          <Link
            to="/portal"
            style={{
              padding: '10px 20px',
              background: '#002B4D',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#ffffff',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e3a8a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#002B4D';
            }}
          >
            ← Back to Portal
          </Link>
        </div>

        {/* Backlog Iframe Container */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: 'calc(100vh - 300px)',
          minHeight: '600px'
        }}>
          <iframe
            src={BACKLOG_URL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            title="Compassion Course Backlog"
          />
        </div>
      </div>
    </Layout>
  );
};

export default BacklogPage;
