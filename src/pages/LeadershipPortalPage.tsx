import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { listTeamsForUser, listTeams } from '../services/leadershipTeamsService';
import { listWorkItemsForUser, listWorkItems, listAllBlockedItems } from '../services/leadershipWorkItemsService';
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
  const { user, userStatus, isActive, isAdmin: isAdminUser, loading: authLoading } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsLoadFailed, setNotificationsLoadFailed] = useState(false);
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [allTeams, setAllTeams] = useState<LeadershipTeam[]>([]);
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [allBlockedItems, setAllBlockedItems] = useState<LeadershipWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsPermissionDenied, setNotificationsPermissionDenied] = useState(false);
  const [teamsLoadError, setTeamsLoadError] = useState<string | null>(null);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const dashboardPermissionDeniedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || !isActive) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationsLoadFailed(false);
      setNotificationsPermissionDenied(false);
      setTeams([]);
      setAllTeams([]);
      setWorkItems([]);
      setAllBlockedItems([]);
      setTeamsLoadError(null);
      setTeamsLoaded(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotificationsLoading(true);
    let cancelled = false;
    const wrap = <T,>(label: string, p: Promise<T>) =>
      p.catch((err: unknown) => {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
        const msg = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
        console.error(`[LeadershipPortalPage] ${label} FAILED: code=${code} message=${msg}`, err);
        throw err;
      });
    Promise.allSettled([
      wrap('notifications', listNotificationsForUser(user.uid, 20)),
      wrap('teamsForUser', listTeamsForUser(user.uid)),
      wrap('teams', listTeams()),
      wrap('workItems', listWorkItemsForUser(user.uid)),
      wrap('blockedItems', listAllBlockedItems()),
    ])
      .then(async (results) => {
        if (cancelled) return;
        const r0 = results[0];
        const r1 = results[1];
        const r2 = results[2];
        const r3 = results[3];
        const r4 = results[4];
        const isPermissionDenied = (r: PromiseSettledResult<unknown>) =>
          r?.status === 'rejected' &&
          ((r as PromiseRejectedResult).reason?.code === 'permission-denied' ||
            (r as PromiseRejectedResult).reason?.code === 'PERMISSION_DENIED');
        const anyPermissionDenied =
          isPermissionDenied(r0) || isPermissionDenied(r1) || isPermissionDenied(r2) || isPermissionDenied(r3) || isPermissionDenied(r4);
        if (anyPermissionDenied && !dashboardPermissionDeniedRef.current) {
          dashboardPermissionDeniedRef.current = true;
          console.error('Dashboard load failed: permission denied (check Firestore rules).');
        }
        if (r0.status === 'fulfilled') {
          setNotifications(r0.value);
          setNotificationsLoadFailed(false);
          setNotificationsPermissionDenied(false);
        } else {
          if (!isPermissionDenied(r0)) console.error('Dashboard load item failed:', 0, r0.reason);
          setNotifications([]);
          setNotificationsLoadFailed(true);
          if (isPermissionDenied(r0)) setNotificationsPermissionDenied(true);
        }
        if (r1.status === 'rejected' && !isPermissionDenied(r1)) {
          console.error('Dashboard load item failed:', 1, r1.reason);
        }
        if (r2.status === 'fulfilled') {
          const allTeamsList = r2.value as LeadershipTeam[];
          setTeams(allTeamsList);
          setAllTeams(allTeamsList);
          setTeamsLoadError(null);
          setTeamsLoaded(true);
          console.log('[LeadershipPortalPage] team list', { currentUserUid: user?.uid, teamCount: allTeamsList.length });
          if (allTeamsList.length === 0) {
            console.warn('[LeadershipPortalPage] Zero teams returned. Ensure Firestore users/' + user?.uid + ' exists with status "active" and role "manager" or "admin", or that your uid is in each team\'s memberIds.');
          }
        } else {
          const reason = (r2 as PromiseRejectedResult).reason;
          if (!isPermissionDenied(r2)) console.error('Dashboard load item failed:', 2, reason);
          setTeamsLoadError(isPermissionDenied(r2) ? 'Permission denied loading teams.' : 'Could not load teams. Check console.');
          setTeams([]);
          setAllTeams([]);
          setTeamsLoaded(true);
        }
        let finalItems: LeadershipWorkItem[] = r3.status === 'fulfilled' ? r3.value : [];
        if (r3.status === 'rejected' && !isPermissionDenied(r3)) {
          console.error('Dashboard load item failed:', 3, r3.reason);
        }
        const teamList = r2.status === 'fulfilled' ? (r2.value as LeadershipTeam[]) : (r1.status === 'fulfilled' ? (r1.value as LeadershipTeam[]) : []);
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
        if (!cancelled) {
          if (r4.status === 'fulfilled') {
            setAllBlockedItems(r4.value);
          } else {
            if (!isPermissionDenied(r4)) console.error('Dashboard load item failed:', 4, r4?.reason);
            setAllBlockedItems([]);
          }
          setWorkItems(finalItems);
        }
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
  }, [user?.uid, isActive]);

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    allTeams.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [allTeams]);

  const loadNotifications = () => {
    if (!user?.uid) return;
    setNotificationsLoading(true);
    listNotificationsForUser(user.uid, 20)
      .then((data) => {
        setNotifications(data);
        setNotificationsLoadFailed(false);
        setNotificationsPermissionDenied(false);
      })
      .catch((err) => {
        const permissionDenied =
          err?.code === 'permission-denied' || err?.code === 'PERMISSION_DENIED';
        if (permissionDenied) {
          setNotificationsPermissionDenied(true);
          console.error('Notifications load failed: permission denied (check Firestore rules for userNotifications).');
        } else {
          console.error('Notifications load failed:', err);
        }
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

  if (authLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
          <p style={secondaryTextStyle}>Loading...</p>
        </div>
      </Layout>
    );
  }

  const showAwaitingApproval = !!user?.uid && !isActive && !isAdminUser;
  if (showAwaitingApproval) {
    console.log('[Leadership gate] Awaiting approval UI: isAdmin (AuthContext)', isAdminUser, 'loading (auth)', authLoading, 'currentUser?.uid', user?.uid);
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
          <div style={widgetStyle}>
            <h2 style={{ ...cardTitleStyle, fontSize: '1.25rem' }}>Awaiting approval</h2>
            <p style={secondaryTextStyle}>
              Your account is created, but it hasn't been approved for the Leadership Portal yet.
            </p>
            <p style={secondaryTextStyle}>
              Status: <strong>{userStatus ?? 'pending'}</strong>
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button style={buttonStyle} onClick={() => window.location.reload()}>
                Refresh
              </button>
              <button style={buttonStyle} onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
                ) : notificationsPermissionDenied ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>
                    You don't have permission to load messages. Check Firestore rules for userNotifications.
                  </p>
                ) : notificationsLoadFailed ? (
                  <>
                    <p style={{ ...secondaryTextStyle, margin: 0 }}>Couldn't load messages.</p>
                    <p style={{ ...secondaryTextStyle, margin: '8px 0 0', fontSize: '0.8rem' }}>
                      If you manage this project, deploy Firestore indexes: firebase deploy --only firestore:indexes
                    </p>
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
                      return (
                        <li key={w.id} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <Link to={`/portal/leadership/tasks/${w.id}`} style={linkStyle}>
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
                {allBlockedItems.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>No blocked tasks.</p>
                ) : (
                  <>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {allBlockedItems.slice(0, 8).map((w) => {
                        const teamName = w.teamId ? teamNameById.get(w.teamId) : null;
                        const subtitle = teamName
                          ? `Task · ${teamName}`
                          : `Work item · ${w.status.replace('_', ' ')}`;
                        return (
                          <li key={w.id} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                            <Link to={`/portal/leadership/tasks/${w.id}`} style={linkStyle}>
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
                {teamsLoadError ? (
                  <p style={{ color: '#b91c1c', fontSize: '0.9rem', margin: 0 }}>{teamsLoadError}</p>
                ) : teams.length === 0 && teamsLoaded ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>
                    No teams were returned. Open the browser console (F12) and look for &quot;team list&quot; to see your user ID. In Firestore, ensure <strong>users/{user?.uid ?? '…'}</strong> exists with <strong>status: &quot;active&quot;</strong> and <strong>role: &quot;manager&quot;</strong> or <strong>&quot;admin&quot;</strong>, or that your ID is in each team&apos;s <strong>memberIds</strong>.
                  </p>
                ) : teams.length === 0 ? (
                  <p style={{ ...secondaryTextStyle, margin: 0 }}>Loading teams…</p>
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
