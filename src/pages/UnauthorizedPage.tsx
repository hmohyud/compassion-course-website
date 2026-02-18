import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="login-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-container" style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ color: '#002B4D', marginBottom: '12px' }}>Not authorized</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          You do not have permission to access this page.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
          Return to home
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
