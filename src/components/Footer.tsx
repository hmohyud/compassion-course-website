import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>The Compassion Course</h3>
            <p>Transforming lives through compassion-centered personal development in over 120 countries.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/programs">Programs</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/compass-companion">Compass Companions</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Get in Touch</h4>
            <ul>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/about">Our Team</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} The Compassion Course. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
