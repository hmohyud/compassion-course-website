import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

const UserRegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Redirect to portal when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/portal', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Initialize reCAPTCHA verifier on component mount
  useEffect(() => {
    try {
      // Clear any existing verifier
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }

      // Initialize new reCAPTCHA verifier
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          // reCAPTCHA expired
          console.log('reCAPTCHA expired');
          setError('reCAPTCHA expired. Please verify again.');
        }
      });

      recaptchaVerifierRef.current = verifier;

      // Cleanup on unmount
      return () => {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      setError('Failed to initialize reCAPTCHA. Please refresh the page.');
    }
  }, []);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h2>Global Compassion Network</h2>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if already logged in
  if (user) {
    return null; // useEffect will handle navigation
  }

  const trimmedPassword = password.trim();
  const trimmedConfirm = confirmPassword.trim();
  const passwordsMatch = trimmedPassword === trimmedConfirm;
  const passwordLongEnough = trimmedPassword.length >= 8;
  const confirmLongEnough = trimmedConfirm.length >= 8;
  const canSubmit = passwordLongEnough && confirmLongEnough && passwordsMatch;

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation handled by useEffect
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwd = password.trim();
    const conf = confirmPassword.trim();

    if (!pwd || !conf) {
      setError('Please enter and confirm your password.');
      return;
    }
    if (pwd !== conf) {
      setError('Passwords do not match.');
      return;
    }
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Check if reCAPTCHA is initialized
    if (!recaptchaVerifierRef.current) {
      setError('reCAPTCHA is not ready. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      await register(email, pwd, recaptchaVerifierRef.current);
      // Navigation will be handled by useEffect
    } catch (error: any) {
      console.error('Registration error:', error);
      // Provide more specific error messages
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (error.code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please try again.');
        // Reset reCAPTCHA
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          try {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'normal',
              callback: () => {
                console.log('reCAPTCHA verified');
              },
              'expired-callback': () => {
                console.log('reCAPTCHA expired');
                setError('reCAPTCHA expired. Please verify again.');
              }
            });
            recaptchaVerifierRef.current = verifier;
          } catch (recaptchaError) {
            console.error('Error reinitializing reCAPTCHA:', recaptchaError);
          }
        }
      } else {
        setError(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Global Compassion Network</h2>
        {error && <div className="error">{error}</div>}
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
          {googleLoading ? 'Signing up...' : 'Sign up with Google'}
        </button>
        <div className="auth-divider">
          <span>or register with email</span>
        </div>
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
              minLength={8}
              placeholder="At least 8 characters"
            />
            {password.length > 0 && !passwordLongEnough && (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                Password must be at least 8 characters.
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
              minLength={8}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                Passwords do not match.
              </p>
            )}
          </div>
          <div className="form-group">
            <div id="recaptcha-container"></div>
          </div>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="btn btn-primary"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Already have an account?<br /><Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default UserRegisterPage;
