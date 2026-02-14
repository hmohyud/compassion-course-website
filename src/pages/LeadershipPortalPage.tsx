import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { listTeamsForUser, listTeams } from '../services/leadershipTeamsService';
import { listWorkItemsForUser, listWorkItems } from '../services/leadershipWorkItemsService';
import { listNotificationsForUser, markNotificationRead } from '../services/notificationService';
import type { UserNotification } from '../services/notificationService';
import type { LeadershipTeam } from '../types/leadership';
import type { LeadershipWorkItem } from '../types/leadership';

const widgetStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const cardTitleStyle: React.CSSProperties = {
  color: '#111827',
  marginBottom: '12px',
  fontSize: '1rem',
  fontWeight: 700,
};

const linkStyle: React.CSSProperties = {
  color: '#002B4D',
  textDecoration: 'underline',
  fontWeight: 500,
};

const secondaryTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '0.875rem',
};

const linkCardStyle: React.CSSProperties = {
  padding: '20px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block',
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  color: '#374151',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};

const LeadershipPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsLoadFailed, setNotificationsLoadFailed] = useState(false);
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [allTeams, setAllTeams] = useState<LeadershipTeam[]>([]);
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationsLoadFailed(false);
      setTeams([]);
      setAllTeams([]);
      setWorkItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotificationsLoading(true);
    let cancelled = false;
    Promise.allSettled([
      listNotificationsForUser(user.uid, 20),
      listTeamsForUser(user.uid),
      listTeams(),
      listWorkItemsForUser(user.uid),
    ])
      .then(async (results) => {
        if (cancelled) return;
        const r0 = results[0];
        const r1 = results[1];
        const r2 = results[2];
        const r3 = results[3];
        if (r0.status === 'fulfilled') {
          setNotifications(r0.value);
          setNotificationsLoadFailed(false);
        } else {
          console.error('Dashboard load item failed:', 0, r0.reason);
          setNotifications([]);
          setNotificationsLoadFailed(true);
        }
        if (r1.status === 'fulfilled') {
          setTeams(r1.value);
        } else {
          console.error('Dashboard load item failed:', 1, r1.reason);
          setTeams([]);
        }
        if (r2.status === 'fulfilled') {
          setAllTeams(r2.value);
        } else {
          console.error('Dashboard load item failed:', 2, r2.reason);
          setAllTeams([]);
        }
        let finalItems: LeadershipWorkItem[] = r3.status === 'fulfilled' ? r3.value : [];
        if (r3.status === 'rejected') {
          console.error('Dashboard load item failed:', 3, r3.reason);
        }
        const teamList = r1.status === 'fulfilled' ? r1.value : [];
        if (finalItems.length === 0 && teamList.length > 0) {
          try {
            const teamItemsArrays = await Promise.all(teamList.map((team) => listWorkItems(team.id)));
            const fromTeams = teamItemsArrays.flat().filter((item) => item.assigneeId === user?.uid);
            const byId = new Map<string, LeadershipWorkItem>();
            fromTeams.forEach((item) => byId.set(item.id, item));
            finalItems = Array.from(byId.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          } catch (_) {
            // keep finalItems as is
          }
        }
        if (!cancelled) setWorkItems(finalItems);
      })
      .catch((err) => {
        console.error('Dashboard load failed:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setNotificationsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    allTeams.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [allTeams]);

  const blockedItems = useMemo(
    () => workItems.filter((w) => w.blocked === true),
    [workItems]
  );

  const loadNotifications = () => {
    if (!user?.uid) return;
    setNotificationsLoading(true);
    listNotificationsForUser(user.uid, 20)
      .then((data) => {
        setNotifications(data);
        setNotificationsLoadFailed(false);
      })
      .catch((err) => {
        console.error('Notifications load failed:', err);
        setNotifications([]);
        setNotificationsLoadFailed(true);
      })
      .finally(() => setNotificationsLoading(false));
  };

  const handleNotificationClick = (n: UserNotification) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.teamId) {
      navigate(`/portal/leadership/teams/${n.teamId}/board`);
    } else {
      navigate('/portal/leadership/backlog');
    }
  };

  const linkCardHover = (e: React.MouseEvent<HTMLAnchorElement>, active: boolean) => {
    if (active) return;
    if (e.type === 'mouseenter') {
      e.currentTarget.style.borderColor = '#002B4D';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } else {
      e.currentTarget.style.borderColor = 'transparent';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Portal
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px', fontSize: '1.75rem', fontWeight: 700 }}>
          My Leader Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '24px' }}>
          Tools and resources for leaders.
        </p>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading...</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '24px',
              }}
            >
              {/* My Messages */}
              <div style={widgetStyle}>
                <h2 style={cardTitleStyle}>My Messages</h2>
                {notificationsLoading ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>Loading…</p>
                ) : notificationsLoadFailed ? (
                  <>
                    <p style={{ ...secondaryTextStyle, margin: 0 }}>Couldn't load messages.</p>
                    <button
                      type="button"
                      onClick={loadNotifications}
                      style={{ ...buttonStyle, marginTop: '12px' }}
                    >
                      Try again
                    </button>
                  </>
                ) : notifications.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>No new mentions.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {notifications.slice(0, 10).map((n) => (
                      <li
                        key={n.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          fontWeight: n.read ? 400 : 600,
                        }}
                        onClick={() => handleNotificationClick(n)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                        role="button"
                        tabIndex={0}
                      >
                        <span style={{ color: '#002B4D' }}>{n.fromUserName}</span>
                        {' mentioned you in a comment on task '}
                        <span style={{ color: '#002B4D', fontWeight: 600 }}>{n.workItemTitle || 'Untitled'}</span>
                        {n.commentTextSnippet && (
                          <span style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                            "{n.commentTextSnippet}"
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* My Tasks */}
              <div style={widgetStyle}>
                <h2 style={cardTitleStyle}>My Tasks</h2>
                {workItems.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>No work items assigned to you.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {workItems.slice(0, 8).map((w) => {
                      const teamName = w.teamId ? teamNameById.get(w.teamId) : null;
                      const subtitle = teamName
                        ? `Task · ${teamName}`
                        : `Work item · ${w.status.replace('_', ' ')}`;
                      const targetUrl = w.teamId
                        ? `/portal/leadership/teams/${w.teamId}/board`
                        : '/portal/leadership/teams';
                      return (
                        <li key={w.id} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <Link to={targetUrl} style={linkStyle}>
                            {w.title}
                          </Link>
                          <span style={{ ...secondaryTextStyle, marginLeft: '6px' }}>({subtitle})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {workItems.length > 0 && (
                  <Link
                    to="/portal/leadership/teams"
                    style={{ ...linkStyle, display: 'inline-block', marginTop: '12px', fontSize: '0.875rem' }}
                  >
                    View on board →
                  </Link>
                )}
              </div>

              {/* Blocked Tasks */}
              <div style={widgetStyle}>
                <h2 style={cardTitleStyle}>Blocked Tasks</h2>
                {blockedItems.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>No blocked tasks.</p>
                ) : (
                  <>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {blockedItems.slice(0, 8).map((w) => {
                        const teamName = w.teamId ? teamNameById.get(w.teamId) : null;
                        const subtitle = teamName
                          ? `Task · ${teamName}`
                          : `Work item · ${w.status.replace('_', ' ')}`;
                        const targetUrl = w.teamId
                          ? `/portal/leadership/teams/${w.teamId}/board`
                          : '/portal/leadership/teams';
                        return (
                          <li key={w.id} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                            <Link to={targetUrl} style={linkStyle}>
                              {w.title}
                            </Link>
                            <span style={{ ...secondaryTextStyle, marginLeft: '6px' }}>({subtitle})</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      to="/portal/leadership/teams"
                      style={{ ...linkStyle, display: 'inline-block', marginTop: '12px', fontSize: '0.875rem' }}
                    >
                      View on board →
                    </Link>
                  </>
                )}
              </div>

              {/* Backlog link card */}
              <Link
                to="/portal/leadership/backlog"
                style={{ ...linkCardStyle, maxWidth: '320px' }}
                onMouseEnter={(e) => linkCardHover(e, false)}
                onMouseLeave={(e) => linkCardHover(e, false)}
              >
                <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Backlog</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                  Add tasks and assign them to teams.
                </p>
              </Link>

              {/* My Teams */}
              <div style={widgetStyle}>
                <h2 style={cardTitleStyle}>My Teams</h2>
                {teams.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>No teams yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {teams.map((t) => (
                      <li key={t.id} style={{ padding: '6px 0' }}>
                        <Link to={`/portal/leadership/teams/${t.id}/board`} style={linkStyle}>
                          {t.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/portal/leadership/teams" style={{ ...buttonStyle, marginTop: '16px' }}>
                  View all teams
                </Link>
              </div>

              {isAdmin && (
                <Link
                  to="/admin/webcasts"
                  style={{ ...linkCardStyle, maxWidth: '320px' }}
                  onMouseEnter={(e) => linkCardHover(e, false)}
                  onMouseLeave={(e) => linkCardHover(e, false)}
                >
                  <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Event Management</h2>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    Schedule and manage events with Google Meet integration.
                  </p>
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  style={{ ...linkCardStyle, maxWidth: '320px' }}
                  onMouseEnter={(e) => linkCardHover(e, false)}
                  onMouseLeave={(e) => linkCardHover(e, false)}
                >
                  <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Admin portal</h2>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    User management, create team, webcasts, content.
                  </p>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default LeadershipPortalPage;
