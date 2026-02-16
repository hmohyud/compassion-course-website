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
  const { user, loading: authLoading, register } = useAuth();
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
