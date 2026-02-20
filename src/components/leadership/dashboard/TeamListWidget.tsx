import React from 'react';
import type { LeadershipTeam } from '../../../types/leadership';

interface TeamListWidgetProps {
  teams: LeadershipTeam[];
  onTeamClick: (teamId: string) => void;
}

const TeamListWidget: React.FC<TeamListWidgetProps> = ({ teams, onTeamClick }) => {
  return (
    <div className="ld-dashboard-widget">
      <h3 className="ld-dashboard-widget-title">Teams</h3>
      <div className="ld-dashboard-widget-body ld-dashboard-widget-body--scroll">
        {teams.length === 0 ? (
          <p className="ld-empty">No teams yet.</p>
        ) : (
          <ul className="ld-dashboard-widget-list">
            {teams.map((t) => (
              <li key={t.id} className="ld-dashboard-widget-list-item">
                <button
                  type="button"
                  className="ld-dashboard-widget-link-button"
                  onClick={() => onTeamClick(t.id)}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TeamListWidget;
