import React from 'react';
import type { LeadershipTeam } from '../../types/leadership';

interface DashboardTabViewProps {
  teams: LeadershipTeam[];
  onSwitchToTeamBoard?: (teamId: string) => void;
}

const DashboardTabView: React.FC<DashboardTabViewProps> = ({ teams, onSwitchToTeamBoard }) => {
  return (
    <div className="ld-dashboard">
      <h2 className="ld-backlog-section-title">Overview</h2>
      <p className="ld-backlog-desc">
        Your teams and quick access to their boards. Select a team above or use the links below to open a board.
      </p>

      {teams.length === 0 ? (
        <p className="ld-empty">No teams yet. Create a team to get started.</p>
      ) : (
        <ul className="ld-dashboard-team-list">
          {teams.map((team) => (
            <li key={team.id} className="ld-dashboard-team-item">
              <div className="ld-dashboard-team-info">
                <span className="ld-dashboard-team-name">{team.name}</span>
                <span className="ld-dashboard-team-meta">
                  {team.memberIds?.length ?? 0} member{(team.memberIds?.length ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
              {onSwitchToTeamBoard && (
                <button
                  type="button"
                  className="ld-btn-sm ld-btn-sm--primary"
                  onClick={() => onSwitchToTeamBoard(team.id)}
                >
                  Open board
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DashboardTabView;
