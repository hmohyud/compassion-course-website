import React from 'react';
import type { LeadershipTeam } from '../../../types/leadership';

interface MyTeamsWidgetProps {
  teams: LeadershipTeam[];
  onAllTeamsClick: () => void;
  onTeamClick?: (teamId: string) => void;
}

const MyTeamsWidget: React.FC<MyTeamsWidgetProps> = ({ teams, onAllTeamsClick, onTeamClick }) => {
  return (
    <div className="ld-dashboard-widget">
      <h3 className="ld-dashboard-widget-title">My Teams</h3>
      <div className="ld-dashboard-widget-body">
        {teams.length === 0 ? (
          <p className="ld-empty">No teams yet.</p>
        ) : (
          <>
            <ul className="ld-dashboard-widget-list">
              {teams.map((t) => (
                <li key={t.id} className="ld-dashboard-widget-list-item">
                  {onTeamClick ? (
                    <button
                      type="button"
                      className="ld-dashboard-widget-link-button"
                      onClick={() => onTeamClick(t.id)}
                    >
                      {t.name}
                    </button>
                  ) : (
                    <span>{t.name}</span>
                  )}
                  <span className="ld-dashboard-widget-meta">
                    {t.memberIds?.length ?? 0} member{(t.memberIds?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ld-btn-sm ld-btn-sm--primary ld-dashboard-widget-btn"
              onClick={onAllTeamsClick}
            >
              All teams
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MyTeamsWidget;
