import React from 'react';
import { Link } from 'react-router-dom';
import type { LeadershipWorkItem } from '../../../types/leadership';

interface BlockedTasksWidgetProps {
  items: LeadershipWorkItem[];
  memberLabels?: Record<string, string>;
  onTaskClick?: (item: LeadershipWorkItem) => void;
}

const BlockedTasksWidget: React.FC<BlockedTasksWidgetProps> = ({ items, onTaskClick }) => {
  return (
    <div className="ld-dashboard-widget">
      <h3 className="ld-dashboard-widget-title">Blocked Tasks</h3>
      <div className="ld-dashboard-widget-body ld-dashboard-widget-body--scroll">
        {items.length === 0 ? (
          <p className="ld-empty">No blocked tasks.</p>
        ) : (
          <ul className="ld-dashboard-widget-list">
            {items.map((w) => (
              <li key={w.id} className="ld-dashboard-widget-list-item">
                <Link
                  to={`/portal/leadership/tasks/${w.id}`}
                  className="ld-dashboard-widget-link"
                  onClick={() => onTaskClick?.(w)}
                >
                  {w.title || 'Untitled'}
                </Link>
                <span className="ld-dashboard-widget-meta">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BlockedTasksWidget;
