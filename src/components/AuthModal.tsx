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
  const { login } = useAuth();
  const { authModalOpen, closeAuthModal } = useAuthModal();
  const navigate = useNavigate();

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
      navigate('/portal');
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
