import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { isDomainBlockingError, getAuthDiagnostics } from '../utils/authDiagnostics';

const AuthModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { authModalOpen, closeAuthModal } = useAuthModal();

  if (!authModalOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeAuthModal();
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      closeAuthModal();
    } catch (err: any) {
      console.error('Login error:', err);
      if (isDomainBlockingError(err)) {
        const diagnostics = getAuthDiagnostics();
        setError(`Authentication blocked: This domain (${diagnostics.currentDomain}) is not authorized.`);
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to log in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──
  const trimmedPwd = password.trim();
  const trimmedConfirm = confirmPassword.trim();
  const passwordsMatch = trimmedPwd === trimmedConfirm;
  const passwordLongEnough = trimmedPwd.length >= 8;
  const canRegister = passwordLongEnough && trimmedConfirm.length >= 8 && passwordsMatch && email.trim().length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }
    if (!passwordLongEnough) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await register(email.trim(), trimmedPwd);
      closeAuthModal();
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger one.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google (works for both login and signup) ──
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
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
        <img src="/globalcompnet.png" alt="Global Compassion Network" className="auth-modal-logo" />
        <h2 id="auth-modal-title" className="auth-modal-title">
          {activeTab === 'login' ? 'Admin Portal' : 'Create admin account'}
        </h2>
        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-modal-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        {error && <div className="auth-modal-error">{error}</div>}

        {/* ── LOGIN TAB ── */}
        {activeTab === 'login' && (
          <>
            <form onSubmit={handleLogin}>
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
              <button type="submit" disabled={loading} className="auth-modal-submit">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <button
              type="button"
              className="auth-modal-google"
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
            <p className="auth-modal-footer-link">
              <Link to="/login" onClick={closeAuthModal}>Forgot password?</Link>
            </p>
          </>
        )}

        {/* ── REGISTER TAB ── */}
        {activeTab === 'register' && (
          <>
            <button
              type="button"
              className="auth-modal-google"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Signing up...' : 'Sign up with Google'}
            </button>
            <div className="auth-divider"><span>or register with email</span></div>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="auth-modal-reg-email">Email</label>
                <input
                  type="email"
                  id="auth-modal-reg-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="auth-modal-reg-password">Password</label>
                <input
                  type="password"
                  id="auth-modal-reg-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                />
                {password.length > 0 && !passwordLongEnough && (
                  <p className="auth-modal-field-hint auth-modal-field-hint--error">
                    Must be at least 8 characters.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="auth-modal-reg-confirm">Confirm password</label>
                <input
                  type="password"
                  id="auth-modal-reg-confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                  autoComplete="new-password"
                  minLength={8}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="auth-modal-field-hint auth-modal-field-hint--error">
                    Passwords do not match.
                  </p>
                )}
              </div>
              <button type="submit" disabled={loading || !canRegister} className="auth-modal-submit">
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>
            <p className="auth-modal-footer-link">
              Already have an account?{' '}
              <button type="button" className="auth-modal-link" onClick={() => switchTab('login')}>
                Sign in here
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
