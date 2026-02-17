import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, hasPasswordProvider, hasGoogleProvider } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/userProfileService';
import {
  validateImageFile,
  uploadUserAvatar,
  deleteUserAvatar,
  createImagePreview,
} from '../../services/photoUploadService';
import { UserProfile } from '../../types/platform';
import Layout from '../../components/Layout';

const UserProfilePage: React.FC = () => {
  const { user, linkEmailPassword, linkGoogleAccount } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sign-in options state
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
  const [setPasswordError, setSetPasswordError] = useState('');
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState('');
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
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
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setAvatarError(validation.error || 'Invalid image file');
      return;
    }

    try {
      const previewUrl = await createImagePreview(file);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      setAvatarRemoved(false);
    } catch {
      setAvatarError('Failed to preview image');
    }

    // Reset file input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarRemoved(true);
    setAvatarError('');
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      let avatarUrl: string | undefined = undefined;

      // Handle avatar changes
      if (avatarFile) {
        setUploadingAvatar(true);

        // Delete old avatar if one exists
        if (profile?.avatar) {
          try {
            await deleteUserAvatar(profile.avatar);
          } catch {
            // non-critical, continue
          }
        }

        // Upload new avatar (auto-resized to 400px JPEG)
        try {
          avatarUrl = await uploadUserAvatar(avatarFile, user.uid);
        } catch (uploadErr) {
          console.error('Avatar upload error:', uploadErr);
          setAvatarError(
            uploadErr instanceof Error
              ? uploadErr.message
              : 'Failed to upload photo. Please try again.'
          );
          setSaving(false);
          setUploadingAvatar(false);
          return;
        }
        setUploadingAvatar(false);
      } else if (avatarRemoved) {
        // User wants to remove avatar
        if (profile?.avatar) {
          try {
            await deleteUserAvatar(profile.avatar);
          } catch {
            // non-critical
          }
        }
        avatarUrl = '';
      }

      const updates: { name: string; bio: string; avatar?: string } = { name, bio };
      if (avatarUrl !== undefined) {
        updates.avatar = avatarUrl;
      }

      await updateUserProfile(user.uid, updates);
      await loadProfile();

      // Reset avatar state
      setAvatarFile(null);
      setAvatarPreview('');
      setAvatarRemoved(false);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setAvatarError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarRemoved(false);
    setAvatarError('');
  };

  // Determine which avatar to show
  const displayAvatar = avatarPreview || (!avatarRemoved ? profile?.avatar : '');
  const initials = (profile?.name || user?.email || '?').charAt(0).toUpperCase();

  if (loading) {
    return (
      <Layout>
        <div className="profile-page">
          <div className="loading"><div className="spinner"></div></div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="profile-page">
          <p className="profile-empty">Profile not found. Please try signing out and back in.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="profile-page">
        <Link to="/portal" className="profile-back-link">
          ← Back to Portal
        </Link>

        {/* ── Profile header card ── */}
        <div className="profile-card profile-card--header">
          <div className="profile-header-row">
            <div className="profile-avatar-display">
              {displayAvatar ? (
                <img src={displayAvatar} alt={profile.name} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-initials">{initials}</span>
              )}
            </div>
            <div className="profile-header-info">
              <h1 className="profile-header-name">{profile.name}</h1>
              <p className="profile-header-email">{profile.email}</p>
              {profile.bio && !editing && (
                <p className="profile-header-bio">{profile.bio}</p>
              )}
            </div>
          </div>

          {saveSuccess && (
            <div className="profile-toast">Profile saved successfully.</div>
          )}

          {!editing ? (
            <button type="button" className="profile-edit-btn" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <div className="profile-edit-form">
              {/* Avatar upload */}
              <div className="profile-field">
                <label className="profile-field-label">Profile photo</label>
                <div className="profile-avatar-edit-row">
                  <div className="profile-avatar-edit-preview">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Preview" className="profile-avatar-img" />
                    ) : (
                      <span className="profile-avatar-initials">{initials}</span>
                    )}
                  </div>
                  <div className="profile-avatar-edit-actions">
                    <button
                      type="button"
                      className="profile-btn profile-btn--secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {displayAvatar ? 'Change photo' : 'Upload photo'}
                    </button>
                    {displayAvatar && (
                      <button
                        type="button"
                        className="profile-btn profile-btn--danger-outline"
                        onClick={handleRemoveAvatar}
                      >
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarFileChange}
                      className="profile-file-input"
                    />
                    <span className="profile-field-hint">JPEG, PNG, WebP, or GIF. Max 5 MB.</span>
                  </div>
                </div>
                {avatarError && <p className="profile-field-error">{avatarError}</p>}
                {(avatarFile || avatarRemoved) && (
                  <div className="profile-avatar-unsaved">
                    <i className="fas fa-info-circle"></i>
                    <span>Photo {avatarFile ? 'selected' : 'removed'} — click <strong>Save changes</strong> below to apply.</span>
                  </div>
                )}
              </div>

              {/* Display name */}
              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-name">Display name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="profile-text-input"
                  placeholder="Your name"
                />
              </div>

              {/* Bio */}
              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-bio">Bio</label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="profile-text-input profile-text-area"
                  placeholder="Tell others a little about yourself"
                />
              </div>

              {/* Actions */}
              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="profile-btn profile-btn--primary"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                >
                  {uploadingAvatar ? 'Uploading photo...' : saving ? 'Saving...' : 'Save changes'}
                </button>
                <button type="button" className="profile-btn profile-btn--ghost" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Account & Security card ── */}
        <div className="profile-card">
          <h2 className="profile-card-title">Account &amp; Security</h2>

          <div className="profile-card-section">
            <h3 className="profile-card-subtitle">Email &amp; password</h3>
            {user && hasPasswordProvider(user) ? (
              <>
                <p className="profile-card-text">You can sign in with your email and password.</p>
                <Link to="/change-password" className="profile-btn profile-btn--secondary">
                  Change password
                </Link>
              </>
            ) : user?.email ? (
              <>
                <p className="profile-card-text">
                  You signed in with Google. Optionally set a password to also sign in with email.
                </p>
                {setPasswordSuccess ? (
                  <p className="profile-card-success">Password set. You can now sign in with email and password.</p>
                ) : (
                  <form
                    className="profile-inline-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSetPasswordError('');
                      if (setPasswordValue.length < 8) {
                        setSetPasswordError('Password must be at least 8 characters.');
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
                  >
                    <input
                      type="password"
                      value={setPasswordValue}
                      onChange={(e) => setSetPasswordValue(e.target.value)}
                      placeholder="New password (min 8 chars)"
                      minLength={6}
                      className="profile-text-input"
                    />
                    <input
                      type="password"
                      value={setPasswordConfirm}
                      onChange={(e) => setSetPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      minLength={6}
                      className="profile-text-input"
                    />
                    {setPasswordError && <p className="profile-field-error">{setPasswordError}</p>}
                    <button type="submit" disabled={settingPassword} className="profile-btn profile-btn--secondary">
                      {settingPassword ? 'Setting...' : 'Set password'}
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </div>

          <div className="profile-card-divider" />

          <div className="profile-card-section">
            <h3 className="profile-card-subtitle">Google account</h3>
            {user && hasGoogleProvider(user) ? (
              <p className="profile-card-success">Google account linked.</p>
            ) : (
              <>
                <p className="profile-card-text">
                  Link a Google account to sign in with Google in addition to email/password.
                </p>
                {linkGoogleError && <p className="profile-field-error">{linkGoogleError}</p>}
                <button
                  type="button"
                  disabled={linkingGoogle}
                  className="profile-btn profile-btn--secondary"
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
                >
                  {linkingGoogle ? 'Linking...' : 'Link Google account'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default UserProfilePage;
