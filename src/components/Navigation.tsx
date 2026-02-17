import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { getUserProfile } from '../services/userProfileService';
import type { UserProfile } from '../types/platform';

const DESKTOP_BREAKPOINT = 768;

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const accountRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT + 1}px)`);
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!user || authLoading) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    getUserProfile(user.uid)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uid, authLoading]);

  useEffect(() => {
    if (!accountOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [accountOpen]);

  const isActive = (path: string) => location.pathname === path;
  const isInPortal = location.pathname === '/portal' || location.pathname.startsWith('/portal/');

  const handlePortalLogout = async () => {
    setAccountOpen(false);
    await logout();
    navigate('/');
  };

  const handleLogInClick = () => {
    setAccountOpen(false);
    openAuthModal();
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/" className="nav-logo-link">
            <img src="/Logo-with-HSW-transparent.png" alt="The Compassion Course" className="nav-logo-img" />
          </Link>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>About Us</Link>
          </li>
          <li className="nav-item">
            <Link to="/compass-companion" className={`nav-link ${isActive('/compass-companion') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
              Compass Companions
            </Link>
          </li>
          {user && (
            <li className="nav-item">
              <Link to="/portal" className={`nav-link ${isActive('/portal') || isInPortal ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Portal</Link>
            </li>
          )}
          {/* Mobile-only account items */}
          {!isDesktop && (
            <>
              <li className="nav-item nav-menu-account-item nav-account-divider">
                <span className="nav-account-divider-line" aria-hidden="true" />
              </li>
              {user ? (
                <>
                  <li className="nav-item nav-menu-account-item">
                    <Link to="/platform/profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>Profile settings</Link>
                  </li>
                  <li className="nav-item nav-menu-account-item">
                    <button type="button" className="nav-account-btn" onClick={() => { setIsMenuOpen(false); handlePortalLogout(); }}>
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item nav-menu-account-item">
                  <button type="button" className="nav-account-btn" onClick={() => { setIsMenuOpen(false); handleLogInClick(); }}>
                    Log in
                  </button>
                </li>
              )}
            </>
          )}
        </ul>

        <div className="nav-right" ref={accountRef}>
          {/* Visible Log in / Sign up button when not logged in */}
          {!user && !authLoading && (
            <button
              type="button"
              className="nav-auth-btn"
              onClick={handleLogInClick}
            >
              Log in
            </button>
          )}

          {/* Avatar + account dropdown when logged in */}
          {user && (
            <>
              <div className="nav-avatar-wrap">
                {!profileLoading && (
                  <button
                    type="button"
                    className="nav-avatar-link"
                    aria-label="Account menu"
                    onClick={() => setAccountOpen((prev) => !prev)}
                  >
                    {profile?.avatar || user.photoURL ? (
                      <img
                        src={profile?.avatar || user.photoURL || ''}
                        alt=""
                        className="nav-avatar-img"
                      />
                    ) : (
                      <span className="nav-avatar-initial">
                        {(profile?.name || user.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                )}
              </div>
              {accountOpen && isDesktop && (
                <div className="nav-account-dropdown">
                  <Link
                    to="/platform/profile"
                    className="nav-account-dropdown-item"
                    onClick={() => setAccountOpen(false)}
                  >
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    className="nav-account-dropdown-item nav-account-dropdown-btn"
                    onClick={handlePortalLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </>
          )}

          {/* Hamburger (mobile only) */}
          {!isDesktop && (
            <button
              type="button"
              className={`hamburger ${isMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="Menu"
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
