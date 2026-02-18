import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { getUpcomingWebcasts } from '../../services/webcastService';
import { Webcast } from '../../types/platform';
import { getLanguageName } from '../../utils/meetLanguages';

const WebcastsPage: React.FC = () => {
  const { user } = useAuth();
  const [webcasts, setWebcasts] = useState<Webcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadWebcasts = async () => {
      setLoading(true);
      try {
        const data = await getUpcomingWebcasts();
        if (!cancelled) setWebcasts(data);
      } catch (error) {
        console.error('Error loading webcasts:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadWebcasts();
    return () => { cancelled = true; };
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>
            Upcoming Webcasts
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Join live webcasts with real-time translation support in 69 languages
          </p>
        </div>

        {webcasts.length === 0 ? (
          <div style={{
            background: '#ffffff',
            padding: '60px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>No Upcoming Webcasts</h2>
            <p style={{ color: '#6b7280' }}>
              Check back soon for scheduled webcasts and training sessions.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {webcasts.map(webcast => (
              <div
                key={webcast.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '30px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '15px', fontSize: '1.5rem' }}>
                  {webcast.title}
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '20px', flex: 1 }}>
                  {webcast.description}
                </p>

                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#6b7280' }}>
                    <strong style={{ color: '#002B4D' }}>📅 Scheduled:</strong> {formatDate(webcast.scheduledAt)}
                  </div>
                  {webcast.duration && (
                    <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#6b7280' }}>
                      <strong style={{ color: '#002B4D' }}>⏱️ Duration:</strong> {webcast.duration} minutes
                    </div>
                  )}
                  {webcast.translationLanguages.length > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      <strong style={{ color: '#002B4D' }}>🌐 Translation:</strong>{' '}
                      {webcast.translationLanguages.slice(0, 3).map(code => getLanguageName(code)).join(', ')}
                      {webcast.translationLanguages.length > 3 && ` +${webcast.translationLanguages.length - 3} more`}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: webcast.status === 'live' ? '#10b981' : '#3b82f6',
                      color: '#fff',
                      fontWeight: 500
                    }}>
                      {webcast.status === 'live' ? '🔴 Live Now' : 'Scheduled'}
                    </span>
                  </div>
                </div>

                {webcast.meetUrl ? (
                  <Link
                    to={`/platform/webcasts/${webcast.id}/join`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px 24px',
                      background: '#002B4D',
                      color: '#fff',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#003d6b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#002B4D';
                    }}
                  >
                    {webcast.status === 'live' ? 'Join Live Webcast' : 'Join Webcast'}
                  </Link>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '12px 24px',
                    background: '#e5e7eb',
                    color: '#6b7280',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    Meet link not available
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WebcastsPage;
