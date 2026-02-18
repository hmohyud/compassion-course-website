import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { listTeams, getTeam, patchTeamBoardId } from '../services/leadershipTeamsService';
import { listWorkItems, getWorkItem, updateWorkItem, deleteWorkItem } from '../services/leadershipWorkItemsService';
import { listNotificationsForUser, createMentionNotifications } from '../services/notificationService';
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
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../components/leadership/TaskForm';

type TabId = 'board' | 'backlog' | 'team' | 'settings' | 'messages';

const TABS: { id: TabId; label: string; requiresTeam: boolean }[] = [
  { id: 'board', label: 'Board', requiresTeam: true },
  { id: 'backlog', label: 'Backlog', requiresTeam: false },
  { id: 'team', label: 'Team', requiresTeam: true },
  { id: 'settings', label: 'Settings', requiresTeam: true },
  { id: 'messages', label: 'Messages', requiresTeam: false },
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
    showBacklogOnBoard?: boolean;
  } | null>(null);
  const [boardMissingError, setBoardMissingError] = useState(false);
  const [teamDataLoading, setTeamDataLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Pending work item to auto-open (from notification click)
  const [pendingEditItemId, setPendingEditItemId] = useState<string | null>(null);

  // Messages overlay: show a task detail modal without leaving Messages tab
  const [messagesOverlayItem, setMessagesOverlayItem] = useState<LeadershipWorkItem | null>(null);
  const [messagesOverlayTeamId, setMessagesOverlayTeamId] = useState<string>('');
  const [messagesOverlayMemberIds, setMessagesOverlayMemberIds] = useState<string[]>([]);
  const [messagesOverlayMemberLabels, setMessagesOverlayMemberLabels] = useState<Record<string, string>>({});
  const [messagesOverlayMemberAvatars, setMessagesOverlayMemberAvatars] = useState<Record<string, string>>({});

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

  // Hide Backlog tab when it's shown as a column on the board
  const visibleTabs = useMemo(() => {
    if (boardSettings?.showBacklogOnBoard) {
      return TABS.filter((t) => t.id !== 'backlog');
    }
    return TABS;
  }, [boardSettings?.showBacklogOnBoard]);

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
        <Link to="/portal" className="ld-back-link">← Back to Portal</Link>
        <h1 className="ld-heading">Leadership Dashboard</h1>
        <p className="ld-subtitle">Manage teams, boards, backlogs, and settings — all in one place.</p>

        {/* ── Top bar: team selector + create team ── */}
        <div className="ld-top-bar">
          <div className="ld-team-selector-wrap">
            {teams.length === 0 ? (
              <div className="ld-team-selector-empty">
                <i className="fas fa-users"></i>
                <span>No teams yet</span>
              </div>
            ) : (
              <select
                className="ld-team-dropdown"
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
              >
                <option value="" disabled>Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.memberIds?.length ?? 0} members)
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            className="ld-create-team-btn"
            onClick={() => setShowCreateTeamModal(true)}
          >
            <i className="fas fa-plus"></i> New Team
          </button>
          {teamsLoading && <span className="ld-empty" style={{ fontSize: '0.85rem' }}>Loading teams…</span>}
        </div>

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
                  initialEditItemId={pendingEditItemId}
                  onInitialEditConsumed={() => setPendingEditItemId(null)}
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
