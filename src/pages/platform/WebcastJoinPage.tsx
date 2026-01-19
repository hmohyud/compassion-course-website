import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { getWebcast, createWebcastSession } from '../../services/webcastService';
import { Webcast } from '../../types/platform';
import { MEET_LANGUAGES, formatLanguageDisplay } from '../../utils/meetLanguages';

const WebcastJoinPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [webcast, setWebcast] = useState<Webcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [sessionCreated, setSessionCreated] = useState(false);

  useEffect(() => {
    if (id) {
      loadWebcast();
    }
  }, [id]);

  const loadWebcast = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getWebcast(id);
      if (!data) {
        navigate('/platform/webcasts');
        return;
      }
      setWebcast(data);
    } catch (error) {
      console.error('Error loading webcast:', error);
      navigate('/platform/webcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!id || !user) return;
    try {
      await createWebcastSession(id, user.uid, selectedLanguage);
      setSessionCreated(true);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const getMeetUrl = () => {
    if (!webcast?.meetUrl) return '';
    // If Meet URL doesn't have translation params, add them
    const url = new URL(webcast.meetUrl);
    if (selectedLanguage && selectedLanguage !== 'en') {
      url.searchParams.set('hl', selectedLanguage);
    }
    return url.toString();
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!webcast) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
          <p>Webcast not found</p>
          <Link to="/platform/webcasts">Back to Webcasts</Link>
        </div>
      </Layout>
    );
  }

  if (!webcast.meetUrl) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
          <div style={{
            background: '#ffffff',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Meet Link Not Available</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              The Google Meet link for this webcast has not been set up yet.
            </p>
            <Link
              to="/platform/webcasts"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#002B4D',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 500
              }}
            >
              Back to Webcasts
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {/* Branded Header */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px 12px 0 0',
          padding: '24px 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              color: '#002B4D',
              margin: 0,
              fontWeight: 600
            }}>
              {webcast.title}
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '4px 0 0 0',
              fontSize: '0.95rem'
            }}>
              {webcast.description}
            </p>
            {webcast.translationLanguages.length > 0 && (
              <p style={{
                color: '#6b7280',
                margin: '8px 0 0 0',
                fontSize: '0.85rem'
              }}>
                🌐 Translation available in {webcast.translationLanguages.length} languages
              </p>
            )}
          </div>
          <Link
            to="/platform/webcasts"
            style={{
              padding: '10px 20px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#002B4D',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
          >
            ← Back to Webcasts
          </Link>
        </div>

        {/* Language Selection and Instructions */}
        <div style={{
          background: '#ffffff',
          padding: '20px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#002B4D', fontWeight: 500 }}>
              Select Translation Language:
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '1rem',
                color: '#002B4D'
              }}
            >
              {MEET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {formatLanguageDisplay(lang)}
                </option>
              ))}
            </select>
          </div>
          {!sessionCreated && (
            <button
              onClick={handleJoin}
              style={{
                padding: '10px 24px',
                background: '#002B4D',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '1rem',
                whiteSpace: 'nowrap'
              }}
            >
              Join Webcast
            </button>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          background: '#f0f9ff',
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '0.9rem',
          color: '#1e40af'
        }}>
          <strong>💡 How to enable translated captions:</strong>
          <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Once in the meeting, click the "Captions" button (CC icon) in the bottom toolbar</li>
            <li>Select "Translate captions" and choose your preferred language</li>
            <li>Captions will appear translated in real-time as the speaker talks</li>
          </ol>
        </div>

        {/* Embedded Meet Iframe */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: 'calc(100vh - 400px)',
          minHeight: '600px'
        }}>
          <iframe
            src={getMeetUrl()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            title={`${webcast.title} - Google Meet`}
            allow="microphone; camera; clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </Layout>
  );
};

export default WebcastJoinPage;
