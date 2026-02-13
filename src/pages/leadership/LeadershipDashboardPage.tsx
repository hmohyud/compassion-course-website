import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { listRecentMessages } from '../../services/leadershipMessagesService';
import { listTeamsForUser } from '../../services/leadershipTeamsService';
import { listWorkItemsForUser } from '../../services/leadershipWorkItemsService';
import type { LeadershipMessage } from '../../types/leadership';
import type { LeadershipTeam } from '../../types/leadership';
import type { LeadershipWorkItem } from '../../types/leadership';

const widgetStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const LeadershipDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LeadershipMessage[]>([]);
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listRecentMessages(10),
      listTeamsForUser(user.uid),
      listWorkItemsForUser(user.uid),
    ])
      .then(([msgList, teamList, itemList]) => {
        if (!cancelled) {
          setMessages(msgList);
          setTeams(teamList);
          setWorkItems(itemList);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
          setTeams([]);
          setWorkItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/leadership"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Leadership Portal
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>My Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '30px' }}>
          Messages, teams, and your work items.
        </p>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading...</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={widgetStyle}>
              <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.1rem' }}>Messages</h2>
              {messages.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>No messages yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {messages.slice(0, 5).map((m) => (
                    <li
                      key={m.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #e5e7eb',
                        fontSize: '0.9rem',
                        color: '#374151',
                      }}
                    >
                      {m.text.slice(0, 80)}
                      {m.text.length > 80 ? '…' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={widgetStyle}>
              <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.1rem' }}>My Teams</h2>
              {teams.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>No teams yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {teams.map((t) => (
                    <li
                      key={t.id}
                      style={{
                        padding: '6px 0',
                        fontSize: '0.9rem',
                        color: '#374151',
                      }}
                    >
                      <Link
                        to={`/portal/leadership/teams/${t.id}`}
                        style={{ color: '#002B4D', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/portal/leadership/teams"
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  color: '#002B4D',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                Teams Kanban →
              </Link>
            </div>

            <div style={widgetStyle}>
              <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.1rem' }}>My Work</h2>
              {workItems.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>No work items assigned to you.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {workItems.slice(0, 5).map((w) => (
                    <li
                      key={w.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #e5e7eb',
                        fontSize: '0.9rem',
                        color: '#374151',
                      }}
                    >
                      {w.title}
                      <span style={{ color: '#6b7280', marginLeft: '8px', textTransform: 'capitalize' }}>
                        ({w.status.replace('_', ' ')})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/portal/leadership/teams"
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  color: '#002B4D',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                View on board →
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeadershipDashboardPage;
