import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Compassion Course</h3>
            <p>Transforming lives through compassion-centered personal development.</p>
          </div>
          <div className="footer-section">
            <h4>Programs</h4>
            <ul>
              <li><Link to="/programs#foundation">Compassion Course</Link></li>
              <li><Link to="/programs#advanced">Advanced Programs</Link></li>
              <li><Link to="/programs#workshops">Evening Workshops</Link></li>
              <li><Link to="/programs#coaching">Personal Coaching</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>About</h4>
            <ul>
              <li><Link to="/about">Company Overview</Link></li>
              <li><Link to="/about#leaders">Meet Our Leaders</Link></li>
              <li><Link to="/#testimonials">What People Say</Link></li>
              <li><Link to="/programs#corporate">Corporate Consulting</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <ul>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><a href="#community">Join Community</a></li>
              <li><a href="#newsletter">Newsletter</a></li>
              <li><a href="#social">Follow Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Compassion Course. All Rights Reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
