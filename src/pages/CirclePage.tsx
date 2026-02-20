import React, { useState } from 'react';
import Layout from '../components/Layout';

const CirclePage: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <Layout hideFooter>
      <div className="iframe-page">
        <div className="iframe-page-content">
          {/* Loading spinner while iframe loads */}
          {!iframeLoaded && (
            <div className="app-loading-overlay" style={{ position: 'absolute', borderRadius: '12px' }}>
              <div className="app-loading-center">
                <div className="app-loading-swirl" />
                <div className="app-loading-swirl-inner" />
                <img
                  src="/Logo-with-HSW-transparent.png"
                  alt=""
                  className="app-loading-logo"
                />
              </div>
            </div>
          )}
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
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CirclePage;
