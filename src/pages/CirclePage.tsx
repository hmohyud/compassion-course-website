import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const CirclePage: React.FC = () => {
  return (
    <Layout hideNavigation hideFooter>
      <div style={{
        padding: '20px',
        maxWidth: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden'
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
          flexWrap: 'wrap' as const,
          gap: '16px',
          flexShrink: 0
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              color: '#002B4D',
              margin: 0,
              fontWeight: 600
            }}>
              Compassion Course Community
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '4px 0 0 0',
              fontSize: '0.95rem'
            }}>
              Connect, learn, and grow with fellow participants
            </p>
          </div>
          <Link
            to="/"
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
            ← Back to Home
          </Link>
        </div>

        {/* Circle Iframe Container */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0
        }}>
          <iframe
            src="https://login.circle.so/sign_in?request_host=www.theglobalcompassionnetwork.com#email"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            title="Compassion Course Community"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </Layout>
  );
};

export default CirclePage;
