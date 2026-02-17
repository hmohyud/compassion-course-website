import React from 'react';
import type { UserNotification } from '../../services/notificationService';
import { markNotificationRead } from '../../services/notificationService';

interface MessagesTabViewProps {
  notifications: UserNotification[];
  loading: boolean;
  onNotificationClick: (notification: UserNotification) => void;
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
    return <p className="ld-empty">No notifications yet.</p>;
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
          <span className="ld-message-from">{n.fromUserName}</span>
          {' mentioned you in '}
          <span className="ld-message-task">{n.workItemTitle || 'Untitled'}</span>
          {n.commentTextSnippet && (
            <span className="ld-message-snippet">"{n.commentTextSnippet}"</span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default MessagesTabView;
