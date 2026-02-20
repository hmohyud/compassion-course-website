import React from 'react';
import Layout from '../components/Layout';

const BACKLOG_URL = import.meta.env.VITE_BACKLOG_URL || 'https://thatagileapp.com/the-compassion-course';

const BacklogPage: React.FC = () => {
  return (
    <Layout hideFooter>
      <div className="iframe-page">
        <div className="iframe-page-content">
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
