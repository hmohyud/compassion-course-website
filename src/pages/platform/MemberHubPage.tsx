import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { getMemberHubConfig, MemberHubDoc } from '../../services/memberHubService';

const cardStyle = {
  padding: '24px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block' as const,
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const MemberHubPage: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<MemberHubDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMemberHubConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch((e) => {
        if (!cancelled) {
          setConfig(null);
          const msg = e instanceof Error ? e.message : 'Failed to load resources';
          const isPermissionDenied = msg.toLowerCase().includes('permission') || (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'permission-denied');
          setError(isPermissionDenied ? 'Resource links could not be loaded. Deploy Firestore rules: run firebase deploy --only firestore:rules (requires Firebase CLI login).' : msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ marginBottom: '12px', color: '#002B4D' }}>Member Hub</h1>
        <p style={{ marginBottom: '24px', color: '#6b7280', fontSize: '18px' }}>
          Shared resources: videos, whiteboards, Meet, Docs, and Drive. Use the email you registered with to access shared links.
        </p>
        {user?.email && (
          <p style={{ marginBottom: '32px', fontSize: '14px', color: '#6b7280' }}>
            Your registered email: <strong>{user.email}</strong>
          </p>
        )}

        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading resources…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <Link
              to="/platform/whiteboards"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Whiteboards</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>Create and share whiteboards in the app.</p>
            </Link>

            <Link
              to="/portal/backlog"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Project backlog</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>View and manage the Compassion Course backlog.</p>
            </Link>

            {config?.externalWhiteboardUrl && (
              <a
                href={config.externalWhiteboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Google Whiteboard</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>Open the shared whiteboard in a new tab.</p>
              </a>
            )}

            <Link
              to="/platform/webcasts"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Google Meet / Webcasts</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>Join scheduled webcasts and Meet sessions.</p>
            </Link>

            {config?.meetUrl && (
              <a
                href={config.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Recurring Meet</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>Open the shared Meet link.</p>
              </a>
            )}

            {config?.videosUrl && (
              <a
                href={config.videosUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Videos</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>Video repository (Drive or YouTube).</p>
              </a>
            )}

            {config?.docs && config.docs.length > 0 && (
              <>
                {config.docs.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={cardStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#002B4D';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>{item.label || 'Google Doc'}</h2>
                    <p style={{ color: '#6b7280', margin: 0 }}>Open in Google Docs.</p>
                  </a>
                ))}
              </>
            )}

            {config?.driveUrl && (
              <a
                href={config.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Google Drive</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>Shared Drive folder.</p>
              </a>
            )}

            {config?.driveUrls && config.driveUrls.length > 0 && config.driveUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '8px' }}>Google Drive {config.driveUrls!.length > 1 ? i + 1 : ''}</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>Shared folder.</p>
              </a>
            ))}
          </div>
        )}

        {!loading && config?.externalWhiteboardEmbedUrl && (
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.25rem' }}>Shared whiteboard</h2>
            <iframe
              src={config.externalWhiteboardEmbedUrl}
              title="Shared whiteboard"
              style={{
                width: '100%',
                height: '500px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
              }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        )}

        <p style={{ marginTop: '32px', fontSize: '14px', color: '#6b7280' }}>
          <Link to="/portal/university" style={{ color: '#002B4D', fontWeight: 600 }}>Back to Compassion Course University</Link>
        </p>
      </div>
    </Layout>
  );
};

export default MemberHubPage;
