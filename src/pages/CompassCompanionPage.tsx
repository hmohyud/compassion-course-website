import React from 'react';
import Layout from '../components/Layout';
import { useScrollReveal } from '../hooks/useScrollReveal';

const CompassCompanionPage: React.FC = () => {
  useScrollReveal();

  return (
    <Layout>
      <section className="companion-page">
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="companion-card reveal">
            <h1>COMPASS Companions</h1>
            <p>
              COMPASS Companions are digital guides that help individuals and families learn and practice conflict resolution.
              Based on the work of Thom Bond, COMPASS Companions offer a unique, educational and problem-solving tool for
              individuals and families to resolve inner and outer conflicts in their daily lives.
            </p>
            <a
              href="https://www.compass-companions.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Visit Compass Companions
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CompassCompanionPage;
