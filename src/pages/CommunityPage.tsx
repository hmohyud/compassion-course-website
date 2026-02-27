import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const GCN_LOGIN_URL =
  'https://login.circle.so/sign_in?request_host=www.theglobalcompassionnetwork.com#email';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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
        {!iframeLoaded && (
          <div className="community-loading">
            <div className="community-loading-spinner" />
            <p>Loading community portal…</p>
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
