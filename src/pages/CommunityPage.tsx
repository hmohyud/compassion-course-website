import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const GCN_LOGIN_URL =
  'https://login.circle.so/sign_in?request_host=www.theglobalcompassionnetwork.com#email';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  // After 6s with no load event, surface a helpful "blocked" message
  // explaining the likely cause (extension / privacy settings) and giving
  // a "Open in new tab" escape hatch.
  const [iframeStuck, setIframeStuck] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!iframeLoaded) setIframeStuck(true);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [iframeLoaded]);

  // On mount, move the Google Translate portal into the community header
  // so it's accessible on this page (which doesn't use Layout/Navigation).
  useEffect(() => {
    const portal = document.getElementById('google-translate-portal');
    const spacer = headerRef.current?.querySelector('.community-header-spacer');
    if (!portal || !spacer) return;

    // Save original styles so we can restore them on unmount
    const originalPosition = portal.style.position;
    const originalTop = portal.style.top;
    const originalLeft = portal.style.left;
    const originalHeight = portal.style.height;
    const originalZIndex = portal.style.zIndex;

    // Move the portal into the header spacer area
    spacer.appendChild(portal);
    portal.style.position = 'static';
    portal.style.top = '';
    portal.style.left = '';
    portal.style.height = 'auto';
    portal.style.zIndex = '';

    return () => {
      // Restore to body with original fixed positioning
      document.body.appendChild(portal);
      portal.style.position = originalPosition;
      portal.style.top = originalTop;
      portal.style.left = originalLeft;
      portal.style.height = originalHeight;
      portal.style.zIndex = originalZIndex;
    };
  }, []);

  return (
    <div className="community-page">
      {/* Header bar with back button */}
      <header className="community-header" ref={headerRef}>
        <button
          type="button"
          className="community-back-btn"
          onClick={() => navigate(-1)}
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <h1 className="community-header-title">
          <i className="fas fa-globe-americas community-header-icon"></i>
          2025/26 Global Compassion Network (GCN)
        </h1>
        <div className="community-header-spacer" />
      </header>

      {/* Embedded GCN login / community */}
      <div className="community-iframe-wrap">
        {!iframeLoaded && !iframeStuck && (
          <div className="community-loading">
            <div className="community-loading-spinner" />
            <p>Loading community portal…</p>
          </div>
        )}
        {!iframeLoaded && iframeStuck && (
          <div className="community-loading iframe-fallback">
            <h2 className="iframe-fallback-title">The community isn't loading here</h2>
            <p className="iframe-fallback-lede">
              A browser extension or privacy setting is probably blocking the
              embed. It works fine in its own tab:
            </p>
            <a
              href={GCN_LOGIN_URL}
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
                  <strong>Work or school network</strong> — the network may
                  block Circle. Try a phone hotspot or home network.
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
        <iframe
          src={GCN_LOGIN_URL}
          title="Global Compassion Network Community"
          className="community-iframe"
          allow="clipboard-write"
          onLoad={() => setIframeLoaded(true)}
          style={{ opacity: iframeLoaded ? 1 : 0 }}
        />
      </div>
    </div>
  );
};

export default CommunityPage;
