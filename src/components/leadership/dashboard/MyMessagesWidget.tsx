import React from 'react';
import type { UserNotification } from '../../../services/notificationService';

interface MyMessagesWidgetProps {
  notifications: UserNotification[];
  loading: boolean;
  onMessageClick: (notification: UserNotification) => void;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MyMessagesWidget: React.FC<MyMessagesWidgetProps> = ({
  notifications,
  loading,
  onMessageClick,
}) => {
  const handleClick = (n: UserNotification) => {
    onMessageClick(n);
  };

  return (
    <div className="ld-dashboard-widget">
      <h3 className="ld-dashboard-widget-title">My Messages</h3>
      <div className="ld-dashboard-widget-body ld-dashboard-widget-body--scroll">
        {loading ? (
          <p className="ld-empty">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="ld-empty">No @-mentions yet.</p>
        ) : (
          <ul className="ld-dashboard-messages-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`ld-dashboard-message-item ${!n.read ? 'ld-message-item--unread' : ''}`}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                role="button"
                tabIndex={0}
              >
                <div className="ld-message-content">
                  <div className="ld-message-top">
                    <span className="ld-message-from">{n.fromUserName || 'Someone'}</span>
                    {' in '}
                    <span className="ld-message-task">{n.workItemTitle || 'Untitled'}</span>
                  </div>
                  {n.commentTextSnippet && (
                    <div className="ld-message-snippet">"{n.commentTextSnippet}"</div>
                  )}
                </div>
                <span className="ld-message-time">{formatTimeAgo(n.createdAt)}</span>
                {!n.read && <span className="ld-message-dot" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyMessagesWidget;
