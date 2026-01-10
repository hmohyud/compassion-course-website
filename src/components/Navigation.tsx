import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/">
            <h2>Compassion Course</h2>
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
            <Link to="/admin/login-4f73b2c" className="nav-link">Login/Register</Link>
          </li>
        </ul>
        
        <div className="nav-register">
          <a href="/#register" className="btn-primary">Schedule & Register</a>
        </div>
        
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
