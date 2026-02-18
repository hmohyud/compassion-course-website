import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

interface LayoutProps {
  children: React.ReactNode;
  /** When true, the top navigation bar is not rendered (e.g. for /portal/circle). */
  hideNavigation?: boolean;
  /** When true, the footer is not rendered. */
  hideFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideNavigation, hideFooter }) => {
  const { loading: authLoading } = useAuth();
  const { loading: permissionsLoading } = usePermissions();
  const [showOverlay, setShowOverlay] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const isReady = !authLoading && !permissionsLoading;

  useEffect(() => {
    if (isReady && showOverlay) {
      // Start fade-out
      setFadeOut(true);
      const timer = setTimeout(() => setShowOverlay(false), 350);
      return () => clearTimeout(timer);
    }
  }, [isReady, showOverlay]);

  return (
    <>
      {showOverlay && (
        <div className={`app-loading-overlay ${fadeOut ? 'app-loading-overlay--fade' : ''}`}>
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
      {!hideNavigation && <Navigation />}
      <main className={hideNavigation ? 'main-content main-content--no-nav' : 'main-content'}>{children}</main>
      {!hideFooter && <Footer />}
      <AuthModal />
    </>
  );
};

export default Layout;
