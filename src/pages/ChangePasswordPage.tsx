import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/userProfileService';
import Layout from '../components/Layout';

const ChangePasswordPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(user, newPassword);
      await updateUserProfile(user.uid, { mustChangePassword: false });
      navigate('/portal', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ color: '#002B4D', marginBottom: '8px' }}>Change your password</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          You must set a new password before continuing.
        </p>
        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="new-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: submitting ? '#9ca3af' : '#002B4D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Updating...' : 'Set new password'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ChangePasswordPage;
