import React from 'react';
import type { UserNotification } from '../../services/notificationService';
import { markNotificationRead } from '../../services/notificationService';

interface MessagesTabViewProps {
  notifications: UserNotification[];
  loading: boolean;
  onNotificationClick: (notification: UserNotification) => void;
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

const MessagesTabView: React.FC<MessagesTabViewProps> = ({
  notifications,
  loading,
  onNotificationClick,
}) => {
  const handleClick = (n: UserNotification) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
    }
    onNotificationClick(n);
  };

  if (loading) return <p className="ld-empty">Loading messages…</p>;

  if (notifications.length === 0) {
    return (
      <div className="ld-messages-empty">
        <i className="fas fa-bell-slash" style={{ fontSize: '2rem', color: '#d1d5db', marginBottom: 12 }}></i>
        <p className="ld-messages-empty-title">No notifications yet</p>
        <p className="ld-messages-empty-desc">
          You'll see messages here when a team member <strong>@mentions</strong> you in a task comment.
          Try mentioning someone with <code>@</code> in a comment to send them a notification.
        </p>
      </div>
    );
  }

  return (
    <ul className="ld-messages-list">
      {notifications.map((n) => (
        <li
          key={n.id}
          className={`ld-message-item ${!n.read ? 'ld-message-item--unread' : ''}`}
          onClick={() => handleClick(n)}
          onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
          role="button"
          tabIndex={0}
        >
          <div className="ld-message-content">
            <div className="ld-message-top">
              <span className="ld-message-from">{n.fromUserName || 'Someone'}</span>
              {' mentioned you in '}
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
  );
};

export default MessagesTabView;
