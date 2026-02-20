import React, { useState, useMemo } from 'react';
import type { LeadershipTeam, LeadershipWorkItem } from '../../types/leadership';
import type { UserNotification } from '../../services/notificationService';
import { getDashboardPrefs, type DashboardPrefs, type WidgetId } from './dashboard/DashboardPrefs';
import DashboardSettingsModal from './dashboard/DashboardSettingsModal';
import MyTeamsWidget from './dashboard/MyTeamsWidget';
import MyTasksWidget from './dashboard/MyTasksWidget';
import BlockedTasksWidget from './dashboard/BlockedTasksWidget';
import TeamListWidget from './dashboard/TeamListWidget';
import MyMessagesWidget from './dashboard/MyMessagesWidget';

interface DashboardTabViewProps {
  teams: LeadershipTeam[];
  notifications: UserNotification[];
  notificationsLoading: boolean;
  allDashboardWorkItems: LeadershipWorkItem[];
  allDashboardMemberLabels: Record<string, string>;
  userId: string;
  onSwitchToTeamBoard: (teamId: string) => void;
  onMessageClick: (notification: UserNotification) => void;
  onAllTeamsClick: () => void;
}

const DashboardTabView: React.FC<DashboardTabViewProps> = ({
  teams,
  notifications,
  notificationsLoading,
  allDashboardWorkItems,
  allDashboardMemberLabels,
  userId,
  onSwitchToTeamBoard,
  onMessageClick,
  onAllTeamsClick,
}) => {
  const [prefs, setPrefs] = useState<DashboardPrefs>(() => getDashboardPrefs());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const myTasksItems = useMemo(() => {
    const assigned = allDashboardWorkItems.filter((w) => {
      const ids = w.assigneeIds ?? (w.assigneeId ? [w.assigneeId] : []);
      if (!ids.includes(userId)) return false;
      if (w.status === 'done') return false;
      if (prefs.myTasksFilter === 'in_progress') return w.status === 'in_progress';
      return true;
    });
    return assigned;
  }, [allDashboardWorkItems, userId, prefs.myTasksFilter]);

  const blockedItems = useMemo(
    () => allDashboardWorkItems.filter((w) => w.blocked === true),
    [allDashboardWorkItems]
  );

  const handleSavePrefs = (newPrefs: DashboardPrefs) => {
    setPrefs(newPrefs);
  };

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'myTeams':
        return (
          <MyTeamsWidget
            key={id}
            teams={teams}
            onAllTeamsClick={onAllTeamsClick}
            onTeamClick={onSwitchToTeamBoard}
          />
        );
      case 'myTasks':
        return (
          <MyTasksWidget
            key={id}
            items={myTasksItems}
            memberLabels={allDashboardMemberLabels}
          />
        );
      case 'blockedTasks':
        return (
          <BlockedTasksWidget
            key={id}
            items={blockedItems}
            memberLabels={allDashboardMemberLabels}
          />
        );
      case 'teamList':
        return (
          <TeamListWidget
            key={id}
            teams={teams}
            onTeamClick={onSwitchToTeamBoard}
          />
        );
      case 'myMessages':
        return (
          <MyMessagesWidget
            key={id}
            notifications={notifications}
            loading={notificationsLoading}
            onMessageClick={onMessageClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="ld-dashboard">
      <div className="ld-dashboard-header">
        <h2 className="ld-dashboard-title">My Dashboard</h2>
        <button
          type="button"
          className="ld-dashboard-settings-btn"
          onClick={() => setSettingsOpen(true)}
        >
          <i className="fas fa-cog" aria-hidden />
          Settings
        </button>
      </div>

      <div className="ld-dashboard-grid">
        {prefs.widgetIds.map((id) => renderWidget(id))}
      </div>

      <DashboardSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSavePrefs}
      />
    </div>
  );
};

export default DashboardTabView;
