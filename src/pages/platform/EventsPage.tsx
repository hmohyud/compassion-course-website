import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const EventsPage: React.FC = () => {
  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/university"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Compassion Course University
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>
          Events
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '30px' }}>
          View upcoming events and sessions.
        </p>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Events and sessions will be listed here. Check back for updates.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
