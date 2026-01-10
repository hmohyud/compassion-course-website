import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isAdmin, loading: authLoading, login } = useAuth();
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
      // Provide more specific error messages
      if (error.code === 'auth/user-not-found') {
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
        <h2>Admin Login</h2>
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
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
