import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isDomainBlockingError, getAuthDiagnostics } from '../../utils/authDiagnostics';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const { user, isAdmin, loading: authLoading, login, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Redirect to admin dashboard when admin status is confirmed
  useEffect(() => {
    console.log('🔄 LoginPage redirect check:', { user: !!user, isAdmin, authLoading });
    if (user && isAdmin && !authLoading) {
      console.log('✅ Admin confirmed, redirecting to dashboard...');
      navigate('/admin', { replace: true });
    } else if (user && !isAdmin && !authLoading) {
      console.warn('⚠️ User logged in but not admin. isAdmin:', isAdmin);
      console.warn('💡 If you just granted admin access, try logging out and back in.');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading state while checking admin status
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h2>Admin Login</h2>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if already logged in as admin
  if (user && isAdmin) {
    return null; // useEffect will handle navigation
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle domain blocking errors with detailed information
      if (isDomainBlockingError(error)) {
        const diagnostics = getAuthDiagnostics();
        const fixGuideLink = 'https://github.com/ccfoundation-admin/compassion-course-website/blob/main/FIX_AUTH_DOMAIN_BLOCKING.md';
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetMessage('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
      setResetEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        setResetMessage('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setResetMessage('Invalid email address format.');
      } else if (error.code === 'auth/too-many-requests') {
        setResetMessage('Too many requests. Please try again later.');
      } else {
        setResetMessage(error.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Admin Login</h2>
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
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(true);
              setError('');
              setResetMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#0066cc',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            Forgot password?
          </button>
        </div>
        {showForgotPassword && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Reset Password</h3>
            {resetMessage && (
              <div style={{
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '4px',
                backgroundColor: resetMessage.includes('sent') ? '#d4edda' : '#f8d7da',
                color: resetMessage.includes('sent') ? '#155724' : '#721c24'
              }}>
                {resetMessage}
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email</label>
                <input
                  type="email"
                  id="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Enter your email address"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={resetLoading} className="btn btn-primary" style={{ flex: 1 }}>
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetMessage('');
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
