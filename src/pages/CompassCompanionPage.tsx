import React from 'react';
import Layout from '../components/Layout';

const CompassCompanionPage: React.FC = () => {
  return (
    <Layout>
      <div style={{ 
        padding: '20px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: 'calc(100vh - 300px)',
          minHeight: '600px'
        }}>
          <iframe
            src="https://www.compass-companions.com/"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            title="Compass Companion"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </Layout>
  );
};

export default CompassCompanionPage;
