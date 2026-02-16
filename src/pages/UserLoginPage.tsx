import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { isDomainBlockingError, getAuthDiagnostics } from '../utils/authDiagnostics';

const UserLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  // Redirect to portal when user is authenticated (after initial check completes)
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/portal', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Show loading state only during active login attempt
  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h2>Global Compassion Network</h2>
          <p>Logging in...</p>
        </div>
      </div>
    );
  }

  // Show login form immediately - don't wait for initial auth check
  // If user is already logged in, redirect will happen via useEffect
  if (user && !authLoading) {
    return null; // useEffect will handle navigation
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation will be handled by useEffect
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle domain blocking errors with detailed information
      if (isDomainBlockingError(error)) {
        const diagnostics = getAuthDiagnostics();
        setError(
          `Authentication blocked: This domain (${diagnostics.currentDomain}) is not authorized. ` +
          `Please authorize it in Firebase Console. ` +
          `See FIX_AUTH_DOMAIN_BLOCKING.md for step-by-step instructions. ` +
          `Check the browser console (F12) for detailed diagnostic information.`
        );
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(error.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Global Compassion Network</h2>
        {error && (
          <div className="error" style={{ 
            padding: '15px', 
            marginBottom: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            <div style={{ marginBottom: error.includes('FIX_AUTH_DOMAIN_BLOCKING') ? '10px' : '0' }}>
              {error}
            </div>
            {error.includes('FIX_AUTH_DOMAIN_BLOCKING') && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Quick Fix:</strong> Open browser console (F12) for detailed diagnostic information and step-by-step instructions.
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Don't have an account?<br /><Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default UserLoginPage;
