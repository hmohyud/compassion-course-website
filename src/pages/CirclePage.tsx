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
                  <h2 className="iframe-fallback-title">The community isn't loading here</h2>
                  <p className="iframe-fallback-lede">
                    This usually means a browser extension or privacy setting is
                    blocking the embed. The community works fine in its own tab:
                  </p>
                  <a
                    href={CIRCLE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary iframe-fallback-cta"
                  >
                    Open the GCN in a new tab
                  </a>
                  <details className="iframe-fallback-details">
                    <summary>If you'd rather fix the embed</summary>
                    <ul>
                      <li>
                        <strong>Ad blockers / privacy extensions</strong> (uBlock
                        Origin, AdGuard, Ghostery, Privacy Badger, Brave Shields)
                        — pause them for <em>compassioncourse.org</em>.
                      </li>
                      <li>
                        <strong>Safari</strong> — Settings → Privacy → uncheck
                        "Prevent cross-site tracking", or enable third-party
                        cookies for <em>circle.so</em>.
                      </li>
                      <li>
                        <strong>Firefox</strong> — lower Enhanced Tracking
                        Protection from "Strict" to "Standard" for this site.
                      </li>
                      <li>
                        <strong>Work or school network</strong> — the network
                        may block Circle. Try a phone hotspot or home network.
                      </li>
                    </ul>
                    <p>
                      Still stuck? Email{' '}
                      <a href="mailto:coursecoordinator@nycnvc.org">
                        coursecoordinator@nycnvc.org
                      </a>{' '}
                      and we'll help.
                    </p>
                  </details>
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
