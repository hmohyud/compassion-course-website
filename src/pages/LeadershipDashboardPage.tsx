import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { listTeams, listTeamsForUser, getTeam, patchTeamBoardId } from '../services/leadershipTeamsService';
import { listWorkItems, getWorkItem, updateWorkItem, deleteWorkItem } from '../services/leadershipWorkItemsService';
import { listNotificationsForUser, createMentionNotifications, markNotificationRead } from '../services/notificationService';
import { getTeamBoardSettings } from '../services/teamBoardSettingsService';
import { getBoard, createBoardForTeam } from '../services/leadershipBoardsService';
import { getUserProfile } from '../services/userProfileService';
import type { UserNotification } from '../services/notificationService';
import type { LeadershipTeam, LeadershipWorkItem, WorkItemLane, WorkItemStatus, WorkItemComment } from '../types/leadership';

import DashboardTabView from '../components/leadership/DashboardTabView';
import BoardTabView from '../components/leadership/BoardTabView';
import BacklogTabView from '../components/leadership/BacklogTabView';
import TeamTabView from '../components/leadership/TeamTabView';
import SettingsTabView from '../components/leadership/SettingsTabView';
import MessagesTabView from '../components/leadership/MessagesTabView';
import AdminTabView from '../components/leadership/AdminTabView';
import CreateTeamModal from '../components/leadership/CreateTeamModal';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../components/leadership/TaskForm';

type TabId = 'dashboard' | 'board' | 'backlog' | 'team' | 'settings' | 'messages' | 'adminPortal';

const TABS: { id: TabId; label: string; requiresTeam: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', requiresTeam: false },
  { id: 'board', label: 'Board', requiresTeam: true },
  { id: 'backlog', label: 'Backlog', requiresTeam: false },
  { id: 'team', label: 'Team', requiresTeam: true },
  { id: 'settings', label: 'Settings', requiresTeam: true },
  { id: 'messages', label: 'Messages', requiresTeam: false },
  { id: 'adminPortal', label: 'Admin Tools', requiresTeam: false },
];

const LeadershipDashboardPage: React.FC = () => {
  const { user, isActive, userStatus, isAdmin: isAdminUser, loading: authLoading, userDocLoading } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Teams
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Team-specific data
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});
  const [teamName, setTeamName] = useState('');
  const [boardSettings, setBoardSettings] = useState<{
    visibleLanes?: WorkItemLane[];
    columnHeaders?: Partial<Record<WorkItemStatus, string>>;
    showBacklogOnBoard?: boolean;
  } | null>(null);
  const [boardMissingError, setBoardMissingError] = useState(false);
  const [teamDataLoading, setTeamDataLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Dashboard tab: work items across all user's teams (for My Tasks / Blocked widgets)
  const [allDashboardWorkItems, setAllDashboardWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [allDashboardMemberLabels, setAllDashboardMemberLabels] = useState<Record<string, string>>({});

  // Pending work item to auto-open (from notification click)
  const [pendingEditItemId, setPendingEditItemId] = useState<string | null>(null);

  // Messages overlay: show a task detail modal without leaving Messages tab
  const [messagesOverlayItem, setMessagesOverlayItem] = useState<LeadershipWorkItem | null>(null);
  const [messagesOverlayTeamId, setMessagesOverlayTeamId] = useState<string>('');
  const [messagesOverlayMemberIds, setMessagesOverlayMemberIds] = useState<string[]>([]);
  const [messagesOverlayMemberLabels, setMessagesOverlayMemberLabels] = useState<Record<string, string>>({});
  const [messagesOverlayMemberAvatars, setMessagesOverlayMemberAvatars] = useState<Record<string, string>>({});

  // Per-team summary stats for the team cards
  const [teamStats, setTeamStats] = useState<Record<string, { backlog: number; todo: number; inProgress: number; done: number; blocked: number; total: number }>>({});

  // Modal
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  // URL sync: read initial state from URL params
  useEffect(() => {
    const urlTeam = searchParams.get('team');
    const urlTab = searchParams.get('tab') as TabId | null;
    if (urlTeam) setSelectedTeamId(urlTeam);
    if (urlTab && TABS.some((t) => t.id === urlTab)) setActiveTab(urlTab);
  }, []); // Run once on mount

  // URL sync: update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTeamId) params.set('team', selectedTeamId);
    if (activeTab !== 'dashboard') params.set('tab', activeTab);
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedTeamId, activeTab]);

  // Load teams + notifications on mount
  useEffect(() => {
    if (!user?.uid || !isActive) {
      setTeams([]);
      setNotifications([]);
      setTeamsLoading(false);
      setNotificationsLoading(false);
      return;
    }
    let cancelled = false;
    setTeamsLoading(true);
    setNotificationsLoading(true);

    const teamsFetch = (isAdminUser || isAdmin)
      ? listTeams().catch(() => [])
      : listTeamsForUser(user.uid).catch(() => []);
    Promise.all([
      teamsFetch,
      listNotificationsForUser(user.uid, 30).catch(() => []),
    ]).then(([teamList, notifs]) => {
      if (cancelled) return;
      setTeams(teamList as LeadershipTeam[]);
      setNotifications(notifs as UserNotification[]);

      // Auto-select team: URL param → localStorage → first team
      const urlTeamId = searchParams.get('team');
      let savedTeamId: string | null = null;
      try { savedTeamId = localStorage.getItem('ld_last_team'); } catch {}
      const tl = teamList as LeadershipTeam[];
      if (urlTeamId && tl.some((t) => t.id === urlTeamId)) {
        setSelectedTeamId(urlTeamId);
      } else if (savedTeamId && tl.some((t) => t.id === savedTeamId)) {
        setSelectedTeamId(savedTeamId);
      } else if (!selectedTeamId && tl.length > 0) {
        setSelectedTeamId(tl[0].id);
      }
    }).finally(() => {
      if (!cancelled) {
        setTeamsLoading(false);
        setNotificationsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user?.uid, isActive]);

  // Load per-team board stats for the team selector cards
  useEffect(() => {
    if (teams.length === 0) { setTeamStats({}); return; }
    let cancelled = false;
    Promise.all(
      teams.map((t) =>
        listWorkItems(t.id)
          .then((items) => {
            const backlog = items.filter((i) => i.status === 'backlog').length;
            const todo = items.filter((i) => i.status === 'todo').length;
            const inProgress = items.filter((i) => i.status === 'in_progress').length;
            const done = items.filter((i) => i.status === 'done').length;
            const blocked = items.filter((i) => i.blocked).length;
            return { teamId: t.id, backlog, todo, inProgress, done, blocked, total: items.length };
          })
          .catch(() => ({ teamId: t.id, backlog: 0, todo: 0, inProgress: 0, done: 0, blocked: 0, total: 0 }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map: typeof teamStats = {};
      results.forEach((r) => { map[r.teamId] = r; });
      setTeamStats(map);
    });
    return () => { cancelled = true; };
  }, [teams]);

  // Load team data when selected team changes
  const loadTeamData = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setTeamDataLoading(true);
    setBoardMissingError(false);
    try {
      const team = await getTeam(teamId);
      if (!team) {
        setWorkItems([]);
        setTeamName('');
        setMemberIds([]);
        setBoardSettings(null);
        setTeamDataLoading(false);
        return;
      }
      setTeamName(team.name ?? '');
      setMemberIds(team.memberIds ?? []);

      let boardId = team.boardId;

      // Auto-initialize board if missing
      if (!boardId) {
        try {
          const newBoard = await createBoardForTeam(teamId);
          boardId = newBoard.id;
          await patchTeamBoardId(teamId, boardId);
        } catch (e) {
          console.error('Failed to auto-create board:', e);
          setBoardMissingError(true);
          setWorkItems([]);
          setBoardSettings(null);
          return;
        }
      }

      const [items, , settings] = await Promise.all([
        listWorkItems(teamId),
        getBoard(boardId),
        getTeamBoardSettings(teamId),
      ]);
      setWorkItems(items);
      setBoardSettings({
        visibleLanes: settings.visibleLanes,
        columnHeaders: settings.columnHeaders,
        showBacklogOnBoard: settings.showBacklogOnBoard,
      });

      // Resolve member labels + avatars
      if (team.memberIds?.length) {
        Promise.all(
          team.memberIds.map((uid) =>
            getUserProfile(uid).then((p) => ({
              uid,
              name: p?.name || p?.email || uid,
              avatar: p?.avatar || '',
            }))
          )
        ).then((results) => {
          setMemberLabels(Object.fromEntries(results.map((r) => [r.uid, r.name])));
          setMemberAvatars(Object.fromEntries(results.filter((r) => r.avatar).map((r) => [r.uid, r.avatar])));
        });
      } else {
        setMemberLabels({});
        setMemberAvatars({});
      }
    } catch {
      setWorkItems([]);
      setTeamName('');
      setMemberIds([]);
      setMemberLabels({});
      setMemberAvatars({});
      setBoardSettings(null);
    } finally {
      setTeamDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) loadTeamData(selectedTeamId);
  }, [selectedTeamId, loadTeamData]);

  // Load all work items for dashboard tab (My Tasks, Blocked widgets)
  useEffect(() => {
    if (activeTab !== 'dashboard' || !user?.uid || teams.length === 0) {
      setAllDashboardWorkItems([]);
      setAllDashboardMemberLabels({});
      return;
    }
    let cancelled = false;
    Promise.all(teams.map((t) => listWorkItems(t.id)))
      .then((arrays) => {
        if (cancelled) return;
        const flat = arrays.flat();
        setAllDashboardWorkItems(flat);
        const assigneeIds = new Set<string>();
        flat.forEach((w) => {
          if (w.assigneeIds?.length) w.assigneeIds.forEach((id) => assigneeIds.add(id));
          else if (w.assigneeId) assigneeIds.add(w.assigneeId);
        });
        return Promise.all(
          Array.from(assigneeIds).map((uid) =>
            getUserProfile(uid).then((p) => ({ uid, name: p?.name || p?.email || uid }))
          )
        );
      })
      .then((profiles) => {
        if (cancelled || !profiles) return;
        setAllDashboardMemberLabels(Object.fromEntries(profiles.map((r) => [r.uid, r.name])));
      })
      .catch(() => {
        if (!cancelled) setAllDashboardWorkItems([]);
      });
    return () => { cancelled = true; };
  }, [activeTab, user?.uid, teams]);

  const refreshTeamData = useCallback(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
      // Also refresh the card stats for this team
      listWorkItems(selectedTeamId)
        .then((items) => {
          const backlog = items.filter((i) => i.status === 'backlog').length;
          const todo = items.filter((i) => i.status === 'todo').length;
          const inProgress = items.filter((i) => i.status === 'in_progress').length;
          const done = items.filter((i) => i.status === 'done').length;
          const blocked = items.filter((i) => i.blocked).length;
          setTeamStats((prev) => ({ ...prev, [selectedTeamId]: { backlog, todo, inProgress, done, blocked, total: items.length } }));
        })
        .catch(() => {});
    }
  }, [selectedTeamId, loadTeamData]);

  // Quiet refresh: just reload work items without loading spinner (for DnD)
  const refreshWorkItemsQuietly = useCallback(() => {
    if (selectedTeamId) {
      listWorkItems(selectedTeamId)
        .then(setWorkItems)
        .catch(() => {});
    }
  }, [selectedTeamId]);

  const refreshNotifications = useCallback(() => {
    if (!user?.uid) return;
    listNotificationsForUser(user.uid, 30)
      .then(setNotifications)
      .catch(() => {});
  }, [user?.uid]);

  // Handle team selector change — save to localStorage for persistence
  const handleTeamChange = (newTeamId: string) => {
    setSelectedTeamId(newTeamId);
    if (newTeamId) {
      try { localStorage.setItem('ld_last_team', newTeamId); } catch {}
    }
    const currentTab = TABS.find((t) => t.id === activeTab);
    if (currentTab?.requiresTeam && !newTeamId) {
      setActiveTab('backlog');
    }
  };

  // Handle tab change
  const handleTabChange = (tabId: TabId) => {
    const tab = TABS.find((t) => t.id === tabId);
    if (tab?.requiresTeam && !selectedTeamId) return;
    setActiveTab(tabId);
  };

  // Handle notification click: show task as overlay on Messages tab
  const handleNotificationClick = useCallback(async (n: UserNotification) => {
    if (!n.workItemId) return;
    // Mark read + refresh
    refreshNotifications();
    // Load the work item
    try {
      const item = await getWorkItem(n.workItemId);
      if (!item) return;
      setMessagesOverlayItem(item);
      const itemTeamId = n.teamId || item.teamId || '';
      setMessagesOverlayTeamId(itemTeamId);
      // Load team member info for the overlay
      if (itemTeamId) {
        const team = await getTeam(itemTeamId);
        if (team?.memberIds?.length) {
          setMessagesOverlayMemberIds(team.memberIds);
          const profiles = await Promise.all(
            team.memberIds.map((uid) =>
              getUserProfile(uid).then((p) => ({
                uid,
                name: p?.name || p?.email || uid,
                avatar: p?.avatar || '',
              }))
            )
          );
          setMessagesOverlayMemberLabels(Object.fromEntries(profiles.map((r) => [r.uid, r.name])));
          setMessagesOverlayMemberAvatars(Object.fromEntries(profiles.filter((r) => r.avatar).map((r) => [r.uid, r.avatar])));
        } else {
          setMessagesOverlayMemberIds([]);
          setMessagesOverlayMemberLabels({});
          setMessagesOverlayMemberAvatars({});
        }
      }
    } catch (err) {
      console.error('Failed to load work item for notification:', err);
    }
  }, [refreshNotifications]);

  // Handle backlog click to switch to team board
  const handleSwitchToTeamBoard = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('board');
  }, []);

  // Dashboard: All teams button → switch to Backlog tab
  const handleAllTeamsClick = useCallback(() => {
    setActiveTab('backlog');
  }, []);

  // Dashboard Messages widget: navigate to task detail and mark read
  const handleDashboardMessageClick = useCallback(
    (n: UserNotification) => {
      if (!n.read) markNotificationRead(n.id).catch(() => {});
      refreshNotifications();
      if (n.workItemId) navigate(`/portal/leadership/tasks/${n.workItemId}`);
    },
    [navigate, refreshNotifications]
  );

  // Handle create team (team creation is admin-only via CF)
  const handleTeamCreated = (teamId: string) => {
    setShowCreateTeamModal(false);
    // Reload teams, then select the new one
    const reloadTeams = (isAdminUser || isAdmin)
      ? listTeams()
      : listTeamsForUser(user!.uid);
    reloadTeams
      .then((newTeams) => {
        setTeams(newTeams);
        setSelectedTeamId(teamId);
        setActiveTab('board');
      })
      .catch(() => {});
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Hide Backlog tab when it's shown as a column on the board (or while settings are still loading
  // to prevent a flash of the tab appearing then disappearing); Admin Portal only for admins
  const visibleTabs = useMemo(() => {
    const hideBacklogTab = boardSettings === null || boardSettings.showBacklogOnBoard;
    const base = hideBacklogTab
      ? TABS.filter((t) => t.id !== 'backlog')
      : TABS;
    const isAdmin_ = !!(isAdminUser || isAdmin);
    if (!isAdmin_) return base.filter((t) => t.id !== 'adminPortal');
    return base;
  }, [boardSettings, isAdminUser, isAdmin]);

  // Auto-switch away from backlog tab if it gets hidden
  useEffect(() => {
    if (boardSettings?.showBacklogOnBoard && activeTab === 'backlog') {
      setActiveTab('board');
    }
  }, [boardSettings?.showBacklogOnBoard, activeTab]);

  // Auth gate
  if (authLoading || userDocLoading) {
    return (
      <Layout>
        <div className="ld-page">
          <div className="loading"><div className="spinner"></div></div>
        </div>
      </Layout>
    );
  }

  const showAwaitingApproval = !!user?.uid && !isActive && !isAdminUser;
  if (showAwaitingApproval) {
    return (
      <Layout>
        <div className="ld-page">
          <div className="ld-team-section">
            <h2 className="ld-team-section-title">Awaiting approval</h2>
            <p className="ld-empty">
              Your account is created, but hasn't been approved for the Leadership Dashboard yet.
              Status: <strong>{userStatus ?? 'pending'}</strong>
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="ld-btn-sm" onClick={() => window.location.reload()}>Refresh</button>
              <button className="ld-btn-sm" onClick={() => navigate('/')}>Back to Home</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="ld-page">
        <h1 className="ld-heading">Leadership Dashboard</h1>
        <p className="ld-subtitle">Manage teams, boards, backlogs, and settings — all in one place.</p>

        {/* ── Team selector cards ── */}
        {teamsLoading ? (
          <div className="ld-team-cards">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ld-skeleton-card">
                <div className="ld-skeleton ld-skeleton-line ld-skeleton-line--title" />
                <div className="ld-skeleton ld-skeleton-line ld-skeleton-line--short" />
                <div className="ld-skeleton ld-skeleton-line ld-skeleton-line--bar" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="ld-team-selector-empty">
            <i className="fas fa-users"></i>
            <span>No teams yet</span>
          </div>
        ) : (
          <div className="ld-team-cards">
            {teams.map((t) => {
              const selected = t.id === selectedTeamId;
              const stats = teamStats[t.id];
              const memberCount = t.memberIds?.length ?? 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`ld-team-card ${selected ? 'ld-team-card--selected' : ''}`}
                  onClick={() => handleTeamChange(t.id)}
                >
                  <div className="ld-team-card__header">
                    <span className="ld-team-card__name">{t.name}</span>
                    {selected && <i className="fas fa-check-circle ld-team-card__check" />}
                  </div>
                  <div className="ld-team-card__meta">
                    <span className="ld-team-card__members">
                      <i className="fas fa-users" />
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                    {stats && (
                      <span className="ld-team-card__done">
                        <i className="fas fa-check" />
                        {stats.done} done
                      </span>
                    )}
                  </div>
                  {stats ? (
                    <div className="ld-team-card__stats">
                      <span className="ld-team-card__stat ld-team-card__stat--backlog">
                        <span className="ld-team-card__stat-val">{stats.backlog}</span> Backlog
                      </span>
                      <span className="ld-team-card__stat ld-team-card__stat--todo">
                        <span className="ld-team-card__stat-val">{stats.todo}</span> To&nbsp;do
                      </span>
                      <span className="ld-team-card__stat ld-team-card__stat--progress">
                        <span className="ld-team-card__stat-val">{stats.inProgress}</span> Active
                      </span>
                      {stats.blocked > 0 && (
                        <span className="ld-team-card__stat ld-team-card__stat--blocked">
                          <span className="ld-team-card__stat-val">{stats.blocked}</span> Blocked
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="ld-team-card__stats ld-team-card__stats--loading">
                      <span className="ld-team-card__stat">Loading…</span>
                    </div>
                  )}
                  {stats && (stats.backlog + stats.todo + stats.inProgress) > 0 && (
                    <div className="ld-team-card__bar">
                      {stats.backlog > 0 && <div className="ld-team-card__bar-seg ld-team-card__bar-seg--backlog" style={{ flex: stats.backlog }} />}
                      {stats.todo > 0 && <div className="ld-team-card__bar-seg ld-team-card__bar-seg--todo" style={{ flex: stats.todo }} />}
                      {stats.inProgress > 0 && <div className="ld-team-card__bar-seg ld-team-card__bar-seg--progress" style={{ flex: stats.inProgress }} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="ld-tab-bar">
          {visibleTabs.map((tab) => {
            const disabled = tab.requiresTeam && !selectedTeamId;
            const isActive_ = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                className={`ld-tab ${isActive_ ? 'ld-tab--active' : ''} ${disabled ? 'ld-tab--disabled' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                disabled={disabled}
              >
                {tab.label}
                {tab.id === 'messages' && unreadCount > 0 && (
                  <span className="ld-tab-badge">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="ld-tab-content">
          {teamDataLoading && activeTab !== 'dashboard' && activeTab !== 'backlog' && activeTab !== 'messages' ? (
            <div className="ld-skeleton-content">
              <div className="ld-skeleton ld-skeleton-line" style={{ width: '35%', height: 20, marginBottom: 16 }} />
              <div className="ld-skeleton ld-skeleton-line" style={{ width: '100%', height: 60, marginBottom: 12 }} />
              <div className="ld-skeleton ld-skeleton-line" style={{ width: '100%', height: 60, marginBottom: 12 }} />
              <div className="ld-skeleton ld-skeleton-line" style={{ width: '80%', height: 60 }} />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && user?.uid && (
                <DashboardTabView
                  teams={teams}
                  notifications={notifications}
                  notificationsLoading={notificationsLoading}
                  allDashboardWorkItems={allDashboardWorkItems}
                  allDashboardMemberLabels={allDashboardMemberLabels}
                  userId={user.uid}
                  loading={teamsLoading}
                  onSwitchToTeamBoard={handleSwitchToTeamBoard}
                  onMessageClick={handleDashboardMessageClick}
                  onAllTeamsClick={handleAllTeamsClick}
                />
              )}

              {activeTab === 'board' && selectedTeamId && (
                <>
                  <div className="ld-board-tab-header">
                    <h2 className="ld-board-tab-team-name">{teamName || 'Board'}</h2>
                    <div className="ld-board-tab-header-actions">
                      <button
                        type="button"
                        className="ld-create-team-btn"
                        onClick={() => setActiveTab('team')}
                      >
                        <i className="fas fa-users" aria-hidden />
                        Team Page
                      </button>
                      {(isAdminUser || isAdmin) && (
                        <button
                          type="button"
                          className="ld-create-team-btn"
                          onClick={() => setActiveTab('settings')}
                        >
                          <i className="fas fa-cog" aria-hidden />
                          Board settings
                        </button>
                      )}
                    </div>
                  </div>
                  <BoardTabView
                    teamId={selectedTeamId}
                    workItems={workItems}
                    memberIds={memberIds}
                    memberLabels={memberLabels}
                    memberAvatars={memberAvatars}
                    boardSettings={boardSettings}
                    boardMissingError={boardMissingError}
                    onRefresh={refreshTeamData}
                    onQuietRefresh={refreshWorkItemsQuietly}
                    initialEditItemId={pendingEditItemId}
                    onInitialEditConsumed={() => setPendingEditItemId(null)}
                  />
                </>
              )}

              {activeTab === 'backlog' && (
                <BacklogTabView
                  teams={teams}
                  isAdmin={!!(isAdminUser || isAdmin)}
                  onSwitchToTeamBoard={handleSwitchToTeamBoard}
                />
              )}

              {activeTab === 'team' && selectedTeamId && (
                <TeamTabView
                  teamId={selectedTeamId}
                  teamName={teamName}
                  memberIds={memberIds}
                  memberLabels={memberLabels}
                  memberAvatars={memberAvatars}
                  workItems={workItems}
                  onRefresh={refreshTeamData}
                />
              )}

              {activeTab === 'settings' && selectedTeamId && (
                <SettingsTabView
                  teamId={selectedTeamId}
                  teamName={teamName}
                  onSettingsSaved={refreshTeamData}
                  onTeamDeleted={() => {
                    // Reload teams and switch to first remaining team (or none)
                    const reloadTeams = (isAdminUser || isAdmin)
                      ? listTeams()
                      : listTeamsForUser(user!.uid);
                    reloadTeams.then((newTeams) => {
                      setTeams(newTeams);
                      if (newTeams.length > 0) {
                        setSelectedTeamId(newTeams[0].id);
                      } else {
                        setSelectedTeamId('');
                      }
                      setActiveTab('board');
                    }).catch(() => {});
                  }}
                />
              )}

              {activeTab === 'messages' && (
                <MessagesTabView
                  notifications={notifications}
                  loading={notificationsLoading}
                  onNotificationClick={handleNotificationClick}
                />
              )}

              {activeTab === 'adminPortal' && (
                <AdminTabView />
              )}

              {/* No team selected + team-required tab */}
              {!selectedTeamId && TABS.find((t) => t.id === activeTab)?.requiresTeam && (
                <p className="ld-empty">Select a team to get started, or create a new one.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create team modal ── */}
      {showCreateTeamModal && (
        <CreateTeamModal
          onCreated={handleTeamCreated}
          onClose={() => setShowCreateTeamModal(false)}
        />
      )}

      {/* ── Messages overlay: task detail modal ── */}
      {messagesOverlayItem && (
        <TaskForm
          mode="edit"
          initialItem={messagesOverlayItem}
          teamId={messagesOverlayTeamId}
          teamMemberIds={messagesOverlayMemberIds}
          memberLabels={messagesOverlayMemberLabels}
          memberAvatars={messagesOverlayMemberAvatars}
          onSave={async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
            if (!messagesOverlayItem) return;
            try {
              await updateWorkItem(messagesOverlayItem.id, {
                title: data.title,
                description: data.description,
                status: data.status,
                lane: data.lane,
                estimate: data.estimate,
                blocked: data.blocked,
                assigneeIds: data.assigneeIds,
                comments: data.comments,
              });
              if (context?.newCommentsWithMentions?.length) {
                for (const c of context.newCommentsWithMentions) {
                  if (c.mentionedUserIds?.length) {
                    await createMentionNotifications(
                      messagesOverlayItem.id, data.title, messagesOverlayTeamId,
                      c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds
                    );
                  }
                }
              }
              setMessagesOverlayItem(null);
              // Refresh team data if we're viewing the same team
              if (messagesOverlayTeamId === selectedTeamId) {
                refreshTeamData();
              }
            } catch (err) {
              console.error('Failed to save from messages overlay:', err);
            }
          }}
          onCommentsChanged={async (updatedComments: WorkItemComment[], context?: TaskFormSaveContext) => {
            if (!messagesOverlayItem) return;
            try {
              await updateWorkItem(messagesOverlayItem.id, { comments: updatedComments });
              if (context?.newCommentsWithMentions?.length) {
                for (const c of context.newCommentsWithMentions) {
                  if (c.mentionedUserIds?.length) {
                    await createMentionNotifications(
                      messagesOverlayItem.id, messagesOverlayItem.title, messagesOverlayTeamId,
                      c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds
                    );
                  }
                }
              }
            } catch (err) {
              console.error('Failed to save comment:', err);
            }
          }}
          onCancel={() => setMessagesOverlayItem(null)}
          onDelete={async (itemId: string) => {
            await deleteWorkItem(itemId);
            setMessagesOverlayItem(null);
            if (messagesOverlayTeamId === selectedTeamId) {
              refreshTeamData();
            }
          }}
        />
      )}
    </Layout>
  );
};

export default LeadershipDashboardPage;
