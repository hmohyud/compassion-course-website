import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { listTeams, getTeam, patchTeamBoardId } from '../services/leadershipTeamsService';
import { listWorkItems } from '../services/leadershipWorkItemsService';
import { listNotificationsForUser } from '../services/notificationService';
import { getTeamBoardSettings } from '../services/teamBoardSettingsService';
import { getBoard, createBoardForTeam } from '../services/leadershipBoardsService';
import { getUserProfile } from '../services/userProfileService';
import type { UserNotification } from '../services/notificationService';
import type { LeadershipTeam, LeadershipWorkItem, WorkItemLane, WorkItemStatus } from '../types/leadership';

import BoardTabView from '../components/leadership/BoardTabView';
import BacklogTabView from '../components/leadership/BacklogTabView';
import TeamTabView from '../components/leadership/TeamTabView';
import SettingsTabView from '../components/leadership/SettingsTabView';
import MessagesTabView from '../components/leadership/MessagesTabView';
import CreateTeamModal from '../components/leadership/CreateTeamModal';

type TabId = 'board' | 'backlog' | 'team' | 'settings' | 'messages';

const TABS: { id: TabId; label: string; requiresTeam: boolean }[] = [
  { id: 'board', label: 'Board', requiresTeam: true },
  { id: 'backlog', label: 'Backlog', requiresTeam: false },
  { id: 'team', label: 'Team', requiresTeam: true },
  { id: 'settings', label: 'Settings', requiresTeam: true },
  { id: 'messages', label: 'Messages', requiresTeam: false },
];

const LeadershipDashboardPage: React.FC = () => {
  const { user, isActive, userStatus, isAdmin: isAdminUser, loading: authLoading } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Teams
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('board');

  // Team-specific data
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});
  const [teamName, setTeamName] = useState('');
  const [boardSettings, setBoardSettings] = useState<{
    visibleLanes?: WorkItemLane[];
    columnHeaders?: Partial<Record<WorkItemStatus, string>>;
  } | null>(null);
  const [boardMissingError, setBoardMissingError] = useState(false);
  const [teamDataLoading, setTeamDataLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

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
    if (activeTab !== 'board') params.set('tab', activeTab);
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

    Promise.all([
      listTeams().catch(() => []),
      listNotificationsForUser(user.uid, 30).catch(() => []),
    ]).then(([teamList, notifs]) => {
      if (cancelled) return;
      setTeams(teamList as LeadershipTeam[]);
      setNotifications(notifs as UserNotification[]);

      // Auto-select team from URL or first team
      const urlTeamId = searchParams.get('team');
      if (urlTeamId && (teamList as LeadershipTeam[]).some((t) => t.id === urlTeamId)) {
        setSelectedTeamId(urlTeamId);
      } else if (!selectedTeamId && (teamList as LeadershipTeam[]).length > 0) {
        setSelectedTeamId((teamList as LeadershipTeam[])[0].id);
      }
    }).finally(() => {
      if (!cancelled) {
        setTeamsLoading(false);
        setNotificationsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user?.uid, isActive]);

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

  const refreshTeamData = useCallback(() => {
    if (selectedTeamId) loadTeamData(selectedTeamId);
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

  // Handle team selector change
  const handleTeamChange = (newTeamId: string) => {
    setSelectedTeamId(newTeamId);
    // If on a team-required tab, stay; otherwise switch to board
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

  // Handle notification click: switch to that team's board tab
  const handleNotificationClick = useCallback((n: UserNotification) => {
    if (n.teamId) {
      setSelectedTeamId(n.teamId);
      setActiveTab('board');
    } else {
      setActiveTab('backlog');
    }
    refreshNotifications();
  }, [refreshNotifications]);

  // Handle backlog click to switch to team board
  const handleSwitchToTeamBoard = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('board');
  }, []);

  // Handle create team
  const handleTeamCreated = (teamId: string) => {
    setShowCreateTeamModal(false);
    // Reload teams, then select the new one
    listTeams()
      .then((newTeams) => {
        setTeams(newTeams);
        setSelectedTeamId(teamId);
        setActiveTab('board');
      })
      .catch(() => {});
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Auth gate
  if (authLoading) {
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
        <Link to="/portal" className="ld-back-link">← Back to Portal</Link>
        <h1 className="ld-heading">Leadership Dashboard</h1>
        <p className="ld-subtitle">Manage teams, boards, backlogs, and settings — all in one place.</p>

        {/* ── Top bar: team selector + create team ── */}
        <div className="ld-top-bar">
          <select
            className="ld-team-selector"
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.target.value)}
          >
            {teams.length === 0 && <option value="">No teams</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="ld-create-team-btn"
            onClick={() => setShowCreateTeamModal(true)}
          >
            + Create Team
          </button>
          {teamsLoading && <span className="ld-empty" style={{ fontSize: '0.85rem' }}>Loading teams…</span>}
        </div>

        {/* ── Tab bar ── */}
        <div className="ld-tab-bar">
          {TABS.map((tab) => {
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
          {teamDataLoading && activeTab !== 'backlog' && activeTab !== 'messages' ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : (
            <>
              {activeTab === 'board' && selectedTeamId && (
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
                />
              )}

              {activeTab === 'backlog' && (
                <BacklogTabView
                  teams={teams}
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
                    listTeams().then((newTeams) => {
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
    </Layout>
  );
};

export default LeadershipDashboardPage;
