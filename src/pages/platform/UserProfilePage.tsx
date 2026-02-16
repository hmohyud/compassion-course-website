import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, hasPasswordProvider, hasGoogleProvider } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/userProfileService';
import { getUserEnrollments } from '../../services/enrollmentService';
import { UserProfile } from '../../types/platform';
import Layout from '../../components/Layout';

const UserProfilePage: React.FC = () => {
  const { user, linkEmailPassword, linkGoogleAccount } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number | null>(null);
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
  const [setPasswordError, setSetPasswordError] = useState('');
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState('');
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getUserEnrollments(user.uid)
      .then((enrollments) => setEnrollmentCount(enrollments.length))
      .catch(() => setEnrollmentCount(0));
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        setName(userProfile.name);
        setBio(userProfile.bio || '');
        setAvatar(userProfile.avatar || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updateUserProfile(user.uid, { name, bio, avatar });
      await loadProfile();
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Profile not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/university"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Compassion Course University
        </Link>
        <h1 style={{ marginBottom: '30px', color: '#002B4D' }}>My Profile</h1>

        {!editing ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              {profile.avatar && (
                <img 
                  src={profile.avatar} 
                  alt={profile.name}
                  style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px' }}
                />
              )}
              <h2 style={{ color: '#002B4D' }}>{profile.name}</h2>
              <p style={{ color: '#6b7280' }}>{profile.email}</p>
              {profile.bio && (
                <p style={{ marginTop: '10px', color: '#111827' }}>{profile.bio}</p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '10px 20px',
                background: '#002B4D',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Display name
              </label>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                This name is shown next to your avatar in the header.
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Avatar URL
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#002B4D',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setBio(profile.bio || '');
                  setAvatar(profile.avatar || '');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  color: '#002B4D',
                  border: '1px solid #002B4D',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <section style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Sign-in options</h2>
          {user && hasPasswordProvider(user) ? (
            <div>
              <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                You can sign in with your email and password.
              </p>
              <Link to="/change-password" style={{ color: '#002B4D', fontSize: '14px' }}>Change password</Link>
            </div>
          ) : user?.email ? (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#6b7280', marginBottom: '12px' }}>
                Set a password to also sign in with your email and password.
              </p>
              {setPasswordSuccess ? (
                <p style={{ color: '#16a34a', marginBottom: '8px' }}>
                  Password set. You can now sign in with your email and password.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSetPasswordError('');
                    if (setPasswordValue.length < 6) {
                      setSetPasswordError('Password must be at least 6 characters.');
                      return;
                    }
                    if (setPasswordValue !== setPasswordConfirm) {
                      setSetPasswordError('Passwords do not match.');
                      return;
                    }
                    setSettingPassword(true);
                    try {
                      await linkEmailPassword(setPasswordValue);
                      setSetPasswordSuccess(true);
                      setSetPasswordValue('');
                      setSetPasswordConfirm('');
                    } catch (err) {
                      setSetPasswordError(err instanceof Error ? err.message : 'Failed to set password.');
                    } finally {
                      setSettingPassword(false);
                    }
                  }}
                  style={{ maxWidth: '320px' }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="set-password" style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#374151' }}>New password</label>
                    <input
                      id="set-password"
                      type="password"
                      value={setPasswordValue}
                      onChange={(e) => setSetPasswordValue(e.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="set-password-confirm" style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#374151' }}>Confirm password</label>
                    <input
                      id="set-password-confirm"
                      type="password"
                      value={setPasswordConfirm}
                      onChange={(e) => setSetPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      minLength={6}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  {setPasswordError && (
                    <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>{setPasswordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={settingPassword}
                    style={{
                      padding: '8px 16px',
                      background: settingPassword ? '#9ca3af' : '#002B4D',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: settingPassword ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {settingPassword ? 'Setting...' : 'Set password'}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1rem' }}>Link Google account</h3>
            {user && hasGoogleProvider(user) ? (
              <p style={{ color: '#16a34a', margin: 0 }}>Google account linked.</p>
            ) : (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '14px' }}>
                  Link a Google account to sign in with Google in addition to your email and password.
                </p>
                {linkGoogleError && (
                  <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>{linkGoogleError}</p>
                )}
                <button
                  type="button"
                  disabled={linkingGoogle}
                  onClick={async () => {
                    setLinkGoogleError('');
                    setLinkingGoogle(true);
                    try {
                      await linkGoogleAccount();
                    } catch (err) {
                      setLinkGoogleError(err instanceof Error ? err.message : 'Failed to link Google account.');
                    } finally {
                      setLinkingGoogle(false);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: linkingGoogle ? '#9ca3af' : '#002B4D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: linkingGoogle ? 'not-allowed' : 'pointer',
                  }}
                >
                  {linkingGoogle ? 'Linking...' : 'Link Google account'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Progress Tracking</h2>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            View your learning progress and achievements.
          </p>
          {enrollmentCount !== null && enrollmentCount > 0 && (
            <p style={{ color: '#111827' }}>
              You're enrolled in {enrollmentCount} course{enrollmentCount !== 1 ? 's' : ''}.
            </p>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default UserProfilePage;
