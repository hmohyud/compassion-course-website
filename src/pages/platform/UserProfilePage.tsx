import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/userProfileService';
import { getUserEnrollments } from '../../services/enrollmentService';
import { UserProfile } from '../../types/platform';
import Layout from '../../components/Layout';

const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number | null>(null);

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
                Name
              </label>
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
