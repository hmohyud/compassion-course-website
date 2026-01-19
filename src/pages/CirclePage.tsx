import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const CirclePage: React.FC = () => {
  return (
    <Layout>
      <div style={{ 
        padding: '20px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)' // Account for nav/footer
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
            to="/portal"
            style={{
              padding: '10px 20px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#002B4D',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
          >
            ← Back to Portal
          </Link>
        </div>

        {/* Circle Iframe Container */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: 'calc(100vh - 300px)', // Adjust based on nav/header height
          minHeight: '600px'
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
