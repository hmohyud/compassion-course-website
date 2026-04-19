import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';

const CIRCLE_URL =
  'https://login.circle.so/sign_in?request_host=www.theglobalcompassionnetwork.com#email';

const CirclePage: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeStuck, setIframeStuck] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  // If the iframe hasn't reported a `load` event within 6 seconds, surface a
  // fallback link so the user always has a way into the community even if
  // Circle ever starts denying embeds (X-Frame-Options / frame-ancestors).
  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      if (!iframeLoaded) setIframeStuck(true);
    }, 6000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [iframeLoaded]);

  return (
    <Layout hideFooter>
      <div className="iframe-page">
        <div className="iframe-page-content">
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
              {iframeStuck && (
                <div className="iframe-fallback">
                  <p>The Community isn't loading here?</p>
                  <a
                    href={CIRCLE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Open the GCN in a new tab
                  </a>
                </div>
              )}
            </div>
          )}
          <iframe
            src={CIRCLE_URL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            title="Compassion Course Community"
            allow="clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CirclePage;
