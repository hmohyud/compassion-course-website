import React from 'react';
import Layout from '../components/Layout';

const CommunityComingSoonPage: React.FC = () => {
  return (
    <Layout>
      <div className="community-coming-soon">
        <div className="community-coming-soon-inner">
          <div className="community-coming-soon-icon">
            <i className="fas fa-users"></i>
          </div>
          <h1>Community</h1>
          <p className="community-coming-soon-date">Coming Soon</p>
          <p className="community-coming-soon-text">
            We're building a space for our global community to connect, share, and grow together. Stay tuned!
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityComingSoonPage;
