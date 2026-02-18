import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { isDomainBlockingError, getAuthDiagnostics } from '../utils/authDiagnostics';

const AuthModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { authModalOpen, closeAuthModal } = useAuthModal();
  const navigate = useNavigate(); // kept for register redirect only

  if (!authModalOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeAuthModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      closeAuthModal();
      // Stay on current page — no redirect
    } catch (err: any) {
      console.error('Login error:', err);
      if (isDomainBlockingError(err)) {
        const diagnostics = getAuthDiagnostics();
        setError(
          `Authentication blocked: This domain (${diagnostics.currentDomain}) is not authorized. ` +
          `Please authorize it in Firebase Console. See FIX_AUTH_DOMAIN_BLOCKING.md for instructions.`
        );
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      closeAuthModal();
      // Stay on current page — no redirect
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const goToRegister = () => {
    closeAuthModal();
    navigate('/register');
  };

  return (
    <div
      className="auth-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="auth-modal-card">
        <button
          type="button"
          className="auth-modal-close"
          onClick={closeAuthModal}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="auth-modal-title" className="auth-modal-title">Portal</h2>
        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-modal-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>
        {activeTab === 'login' && (
          <>
            {error && (
              <div
                className="auth-modal-error"
                style={{
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '4px',
                  border: '1px solid #f5c6cb',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="auth-modal-email">Email</label>
                <input
                  type="email"
                  id="auth-modal-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="auth-modal-password">Password</label>
                <input
                  type="password"
                  id="auth-modal-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="btn btn-google"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
              <Link to="/login" onClick={closeAuthModal}>Forgot password?</Link>
            </p>
          </>
        )}
        {activeTab === 'register' && (
          <div style={{ padding: '8px 0', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>Create an account to access the portal.</p>
            <button type="button" className="btn btn-primary" onClick={goToRegister} style={{ width: '100%' }}>
              Go to Register page
            </button>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>
              Already have an account?{' '}
              <button type="button" className="auth-modal-link" onClick={() => { setActiveTab('login'); setError(''); }}>
                Log in here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
