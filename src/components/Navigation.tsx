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
    setProfileLoading(true);
    getUserProfile(user.uid)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
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

  const handleHamburgerClick = () => {
    if (isDesktop) {
      setAccountOpen((prev) => !prev);
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  const handleLogInClick = () => {
    setAccountOpen(false);
    openAuthModal();
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/" className="nav-logo-text">
            The Compassion Course
          </Link>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Home</Link>
          </li>
          <li className="nav-item dropdown">
            <Link to="/programs" className={`nav-link ${isActive('/programs') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
              Programs <i className="fas fa-chevron-down"></i>
            </Link>
            <div className="dropdown-content">
              <Link to="/programs#foundation">Compassion Course</Link>
              <Link to="/programs#advanced">Advanced Programs</Link>
              <Link to="/programs#workshops">Evening Workshops</Link>
              <Link to="/programs#coaching">Personal Coaching</Link>
            </div>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>About Us</Link>
          </li>
          <li className="nav-item">
            <a href="/#testimonials" className="nav-link" onClick={() => setIsMenuOpen(false)}>What People Say</a>
          </li>
          <li className="nav-item">
            <Link to="/compass-companion" className={`nav-link ${isActive('/compass-companion') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
              Compass Companions
            </Link>
          </li>
          {/* Account items in slide-out (mobile only) */}
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
        </ul>

        <div className="nav-right" ref={accountRef}>
          {user && !isInPortal && (
            <Link to="/portal" className="nav-link nav-link-portal">Portal</Link>
          )}
          {!user && (
            <button type="button" className="nav-link nav-link-portal nav-link-btn" onClick={handleLogInClick}>
              Portal
            </button>
          )}
          {user && (
            <div className="nav-avatar-wrap">
              {!profileLoading && (
                <Link to="/platform/profile" className="nav-avatar-link" aria-label="Your profile">
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
                </Link>
              )}
            </div>
          )}
          <div className={`nav-account-wrap ${accountOpen ? 'nav-account-open' : ''}`}>
            <button
              type="button"
              className={`hamburger ${!isDesktop && isMenuOpen ? 'active' : ''}`}
              onClick={handleHamburgerClick}
              aria-expanded={isDesktop ? accountOpen : isMenuOpen}
              aria-haspopup="menu"
              aria-label={isDesktop ? 'Account menu' : 'Menu'}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
            {isDesktop && (
              <div className="nav-account-dropdown">
                {user ? (
                  <>
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
                  </>
                ) : (
                  <button
                    type="button"
                    className="nav-account-dropdown-item nav-account-dropdown-btn"
                    onClick={handleLogInClick}
                  >
                    Log in
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
