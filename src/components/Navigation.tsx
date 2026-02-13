import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isInPortal = location.pathname === '/portal' || location.pathname.startsWith('/portal/');

  const handlePortalLogout = async () => {
    await logout();
    navigate('/');
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
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
          </li>
          <li className="nav-item dropdown">
            <Link to="/programs" className={`nav-link ${isActive('/programs') ? 'active' : ''}`}>
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
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About Us</Link>
          </li>
          <li className="nav-item">
            <a href="/#testimonials" className="nav-link">What People Say</a>
          </li>
          <li className="nav-item">
            <Link to="/compass-companion" className={`nav-link ${isActive('/compass-companion') ? 'active' : ''}`}>
              Compass Companions
            </Link>
          </li>
          {user && !isInPortal && (
            <li className="nav-item">
              <Link to="/portal" className="nav-link">Portal</Link>
            </li>
          )}
          <li className="nav-item">
            {user ? (
              <button type="button" className="nav-portal-btn" onClick={handlePortalLogout}>
                Logout
              </button>
            ) : (
              <Link to="/login" className="nav-portal-btn">Portal Login</Link>
            )}
          </li>
        </ul>
        
        <div className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
