import React from 'react';
import Layout from '../components/Layout';

// Compass Companion page - displays link to external site (no iframe)
const CompassCompanionPage: React.FC = () => {
  return (
    <Layout>
      <section style={{
        padding: '4rem 2rem',
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '3rem 2rem',
            margin: '0 auto'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              marginBottom: '1.5rem',
              color: '#111827',
              fontWeight: '600'
            }}>
              COMPASS Companions
            </h1>
            <p style={{
              fontSize: '1.25rem',
              marginBottom: '2.5rem',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              COMPASS Companions are digital guides that help individuals and families learn and practice conflict resolution. 
              Based on the work of Thom Bond, COMPASS Companions offer a unique, educational and problem-solving tool for 
              individuals and families to resolve inner and outer conflicts in their daily lives.
            </p>
            <a
              href="https://www.compass-companions.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '1rem 2.5rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              Visit Compass Companions →
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CompassCompanionPage;
