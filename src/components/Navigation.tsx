import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { usePermissions } from '../context/PermissionsContext';
import { getUserProfile } from '../services/userProfileService';
import type { UserProfile } from '../types/platform';
import GoogleTranslate from './GoogleTranslate';

// Fallback breakpoint used until JS measures the actual required width.
const DEFAULT_DESKTOP_BREAKPOINT = 1260;
// Safety padding so islands never "touch" — extra breathing room because
// .nav-menu is absolutely-positioned and centered, so the left and right
// islands approach it symmetrically from both sides.
const NAV_ISLAND_PADDING = 140;

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isScreenDesktop, setIsScreenDesktop] = useState(true);
  const [isTranslated, setIsTranslated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  // Dynamic breakpoint: measured from actual nav content, not hardcoded.
  const [breakpoint, setBreakpoint] = useState(DEFAULT_DESKTOP_BREAKPOINT);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  // Peak-observed width of .nav-right. Cached so that when tight mode
  // compacts Compass Companions, the shrunken scrollWidth doesn't feed
  // back into the breakpoint and cause oscillation.
  const peakRightRef = useRef(0);
  const peakMenuRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { role, isAdmin } = usePermissions();
  const showLeadership = role === 'manager' || role === 'admin' || isAdmin;

  // When translated, force hamburger regardless of screen size
  const isDesktop = isScreenDesktop && !isTranslated;

  // Dynamic breakpoint. .nav-menu is absolutely-positioned (left:50%, centered)
  // — NOT a flex child — so the min viewport width isn't a simple sum of
  // island widths. Layout:
  //   LEFT  = logo + Google-Translate portal (portal is position:fixed right
  //           after the logo on desktop)
  //   RIGHT = .nav-right (Compass Companions + avatar, margin-left:auto)
  //   MID   = .nav-menu, centered on the container
  //
  // For MID not to collide with either side, the container must fit MID plus
  // twice the bigger of the two side islands (plus padding on both sides).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const menu = menuRef.current;
    if (!nav || !menu) return;

    // Reset peak trackers when the nav membership actually changes
    // (sign-in/out, role change). Within a single config we only grow, so
    // compaction of a child (isTight → icon-only) can't lower the breakpoint.
    peakRightRef.current = 0;
    peakMenuRef.current = 0;

    function remeasure() {
      if (!nav || !menu) return;
      const logo = nav.querySelector<HTMLElement>('.nav-logo');
      const right = nav.querySelector<HTMLElement>('.nav-right');
      const translate = document.getElementById('google-translate-portal');
      if (menu.scrollWidth < 50) return;
      peakMenuRef.current = Math.max(peakMenuRef.current, menu.scrollWidth);
      peakRightRef.current = Math.max(peakRightRef.current, right?.scrollWidth ?? 0);
      const leftIsland = (logo?.scrollWidth ?? 0) + (translate?.offsetWidth ?? 0);
      const rightIsland = peakRightRef.current;
      const sideReserve = Math.max(leftIsland, rightIsland) + NAV_ISLAND_PADDING;
      const needed = peakMenuRef.current + 2 * sideReserve;
      setBreakpoint(needed);
    }

    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(menu);
    const translate = document.getElementById('google-translate-portal');
    if (translate) ro.observe(translate);
    const right = nav.querySelector<HTMLElement>('.nav-right');
    if (right) ro.observe(right);
    const logo = nav.querySelector<HTMLElement>('.nav-logo');
    if (logo) ro.observe(logo);
    return () => ro.disconnect();
  }, [user, isAdmin, showLeadership]);

  // Apply the (now-dynamic) breakpoint against the current window width.
  useEffect(() => {
    function check() {
      setIsScreenDesktop(window.innerWidth >= breakpoint);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  // Toggle an html-level class so the hamburger CSS (which already exists
  // for .gt-translated) applies whenever JS says we're below the dynamic
  // breakpoint. Keeps CSS and JS in sync with a single source of truth.
  useEffect(() => {
    document.documentElement.classList.toggle('nav-force-hamburger', !isDesktop);
    return () => {
      document.documentElement.classList.remove('nav-force-hamburger');
    };
  }, [isDesktop]);

  // Watch for .gt-translated class on <html> (set by GoogleTranslate.tsx)
  useEffect(() => {
    const checkTranslated = () => {
      setIsTranslated(document.documentElement.classList.contains('gt-translated'));
    };
    checkTranslated();
    const observer = new MutationObserver(checkTranslated);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
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

  const handleAdminPortalClick = () => {
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
    <nav className="navbar" ref={navRef}>
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/" className="nav-logo-link">
            <img
              src="/logo_heart.png"
              alt="The Compassion Course"
              className="nav-logo-img nav-logo-heart"
            />
          </Link>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`} ref={menuRef}>
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/learn-more" className={`nav-link ${isActive('/learn-more') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Learn More</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>About Us</Link>
          </li>
          <li className="nav-item">
            <Link to="/weekly" className={`nav-link ${isActivePrefix('/weekly') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
              <i className="fas fa-calendar-week nav-weekly-icon" aria-hidden="true"></i>
              Member Portal
            </Link>
          </li>
          {user && showLeadership && (
            <li className="nav-item">
              <Link to="/portal/leadership" className={`nav-link ${isActivePrefix('/portal/leadership') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                Dashboard
              </Link>
            </li>
          )}
          <li className="nav-item">
            <Link to="/portal/community" className={`nav-link nav-link--login ${isActive('/portal/community') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
              Log in
            </Link>
          </li>
          <li className="nav-item">
            <a href="https://compassioncf.com/donate" target="_blank" rel="noopener noreferrer" className="nav-link nav-link--donate" onClick={() => setIsMenuOpen(false)}>
              <i className="fas fa-heart nav-donate-icon"></i> Donate
            </a>
          </li>
          {user && (
            <>
              <li className="nav-item nav-item--community">
                <Link to="/community" className={`nav-link nav-link--community ${isActive('/community') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
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
              {!user && (
                <li className="nav-item">
                  <button type="button" className="nav-link nav-link--admin-mobile" onClick={() => { setIsMenuOpen(false); handleAdminPortalClick(); }}>
                    <i className="fas fa-lock"></i>
                    Admin Portal
                  </button>
                </li>
              )}
              {user && (
                <>
                  <li className="nav-item nav-menu-account-item nav-account-divider">
                    <span className="nav-account-divider-line" aria-hidden="true" />
                  </li>
                  <li className="nav-item nav-menu-account-item nav-menu-account-header">
                    <span className="nav-avatar-circle nav-avatar-circle--menu">
                      {profile?.avatar || user.photoURL ? (
                        <img src={profile?.avatar || user.photoURL || ''} alt="" className="nav-avatar-img" />
                      ) : (
                        <span className="nav-avatar-initial">{initials}</span>
                      )}
                    </span>
                    <span className="nav-menu-account-info">
                      <span className="nav-menu-account-name">{profile?.name || user.displayName || 'User'}</span>
                      <span className="nav-menu-account-email">{user.email}</span>
                    </span>
                  </li>
                  <li className="nav-item nav-menu-account-item">
                    <Link to="/platform/profile" className="nav-account-btn" onClick={() => setIsMenuOpen(false)}>
                      <i className="fas fa-user-cog nav-menu-account-icon"></i>
                      Profile settings
                    </Link>
                  </li>
                  <li className="nav-item nav-menu-account-item">
                    <button type="button" className="nav-account-btn" onClick={() => { setIsMenuOpen(false); handlePortalLogout(); }}>
                      <i className="fas fa-sign-out-alt nav-menu-account-icon"></i>
                      Logout
                    </button>
                  </li>
                </>
              )}
            </>
          )}
        </ul>

        <GoogleTranslate />
        <div className="nav-right">
          <a
            href="https://www.compass-companions.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-companion-link nav-companion-link--icon"
            aria-label="Compass Companions"
            data-tooltip="Compass Companions — AI-guided practice for Nonviolent Communication"
          >
            <i className="fas fa-robot nav-companion-icon" aria-hidden="true"></i>
          </a>

          {/* Admin Portal button — opens auth modal popup (hidden when signed in) */}
          {!user && (
            <button
              type="button"
              className="nav-admin-link"
              title="Admin Portal"
              onClick={handleAdminPortalClick}
            >
              <i className="fas fa-lock nav-admin-icon"></i>
              <span className="nav-admin-text">Admin Portal</span>
            </button>
          )}

          {/* Avatar + name + account dropdown when logged in (desktop only — mobile uses hamburger menu) */}
          {user && isDesktop && (
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
                      {showLeadership && (
                        <>
                          <div className="nav-account-dropdown-divider" />
                          <Link
                            to="/portal/leadership"
                            className="nav-account-dropdown-item"
                            onClick={() => setAccountOpen(false)}
                          >
                            <i className="fas fa-columns nav-dropdown-icon"></i>
                            Dashboard
                          </Link>
                        </>
                      )}
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
