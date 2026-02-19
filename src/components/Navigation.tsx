import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { usePermissions } from '../context/PermissionsContext';
import { getUserProfile } from '../services/userProfileService';
import type { UserProfile } from '../types/platform';

const DESKTOP_BREAKPOINT = 1080;

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
  const { role, isAdmin } = usePermissions();
  const showLeadership = role === 'manager' || role === 'admin' || isAdmin;

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
  const isActivePrefix = (prefix: string) => location.pathname === prefix || location.pathname.startsWith(prefix + '/');

  const handlePortalLogout = async () => {
    setAccountOpen(false);
    await logout();
    navigate('/');
  };

  const handleLogInClick = () => {
    setAccountOpen(false);
    openAuthModal();
  };

  // Derive display name and initials
  const displayName = (() => {
    const n = (profile?.name || '').trim();
    if (n) return n.split(/\s+/)[0]; // First name only
    if (user?.displayName) return user.displayName.split(/\s+/)[0];
    if (user?.email) return user.email.split('@')[0];
    return '';
  })();

  const initials = (() => {
    const n = (profile?.name || '').trim();
    if (n) {
      const parts = n.split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return (user?.email || '?').charAt(0).toUpperCase();
  })();

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
            <Link to="/learn-more" className={`nav-link ${isActive('/learn-more') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Learn More</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>About Us</Link>
          </li>
          {user && (
            <>
              {showLeadership && (
                <li className="nav-item">
                  <Link to="/portal/leadership" className={`nav-link ${isActivePrefix('/portal/leadership') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                    Dashboard
                  </Link>
                </li>
              )}
              <li className="nav-item nav-item--community">
                <Link to="/portal/circle" className={`nav-link nav-link--community ${isActive('/portal/circle') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                  <i className="fas fa-users nav-community-icon"></i>
                  Community
                </Link>
              </li>
            </>
          )}
          {/* Mobile-only: Compass Companions + account items */}
          {!isDesktop && (
            <>
              <li className="nav-item">
                <a href="https://www.compass-companions.com/" target="_blank" rel="noopener noreferrer" className="nav-link nav-link--external" onClick={() => setIsMenuOpen(false)}>
                  Compass Companions
                  <i className="fas fa-external-link-alt nav-external-icon"></i>
                </a>
              </li>
              <li className="nav-item nav-menu-account-item nav-account-divider">
                <span className="nav-account-divider-line" aria-hidden="true" />
              </li>
              {user ? (
                <li className="nav-item nav-menu-account-item">
                  <button type="button" className="nav-account-btn" onClick={() => { setIsMenuOpen(false); handlePortalLogout(); }}>
                    Logout
                  </button>
                </li>
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

        <div className="nav-right">
          <a
            href="https://www.compass-companions.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-companion-link"
            title="Compass Companions"
          >
            <i className="fas fa-compass nav-companion-icon"></i>
            <span className="nav-companion-text">Compass Companions</span>
            <i className="fas fa-external-link-alt nav-companion-ext"></i>
          </a>

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

          {/* Avatar + name + account dropdown when logged in */}
          {user && (
            <div className="nav-avatar-wrap" ref={accountRef}>
              <button
                type="button"
                className="nav-avatar-link"
                aria-label="Account menu"
                onClick={() => setAccountOpen((prev) => !prev)}
              >
                <span className="nav-avatar-circle">
                  {profile?.avatar || user.photoURL ? (
                    <img
                      src={profile?.avatar || user.photoURL || ''}
                      alt=""
                      className="nav-avatar-img"
                    />
                  ) : (
                    <span className="nav-avatar-initial">{initials}</span>
                  )}
                </span>
                {isDesktop && displayName && (
                  <span className="nav-avatar-name">{displayName}</span>
                )}
                <i className="fas fa-chevron-down nav-avatar-chevron"></i>
              </button>
              {accountOpen && (
                <div className="nav-account-dropdown">
                  {isDesktop && (
                    <>
                      <div className="nav-account-dropdown-header">
                        <span className="nav-account-dropdown-name">{profile?.name || user.displayName || 'User'}</span>
                        <span className="nav-account-dropdown-email">{user.email}</span>
                      </div>
                      <div className="nav-account-dropdown-divider" />
                      <Link
                        to="/portal"
                        className="nav-account-dropdown-item"
                        onClick={() => setAccountOpen(false)}
                      >
                        <i className="fas fa-th-large nav-dropdown-icon"></i>
                        Portal
                      </Link>
                    </>
                  )}
                  <Link
                    to="/platform/profile"
                    className="nav-account-dropdown-item"
                    onClick={() => setAccountOpen(false)}
                  >
                    <i className="fas fa-user-cog nav-dropdown-icon"></i>
                    Profile settings
                  </Link>
                  {isDesktop && <div className="nav-account-dropdown-divider" />}
                  <button
                    type="button"
                    className="nav-account-dropdown-item nav-account-dropdown-btn"
                    onClick={handlePortalLogout}
                  >
                    <i className="fas fa-sign-out-alt nav-dropdown-icon"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
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
