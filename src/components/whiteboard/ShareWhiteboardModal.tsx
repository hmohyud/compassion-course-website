import React, { useState, useEffect } from 'react';
import { listMembers, addMember } from '../../services/whiteboards/whiteboardService';
import { resolveEmailToUserId } from '../../services/users/userLookupService';
import { messageFromCaught } from '../../services/whiteboards/whiteboardErrors';
import type { BoardMemberDoc, BoardMemberRole } from '../../services/whiteboards/whiteboardTypes';

interface ShareWhiteboardModalProps {
  boardId: string;
  onClose: () => void;
}

const ROLES: { value: BoardMemberRole; label: string }[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export const ShareWhiteboardModal: React.FC<ShareWhiteboardModalProps> = ({ boardId, onClose }) => {
  const [members, setMembers] = useState<BoardMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BoardMemberRole>('editor');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listMembers(boardId)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter an email address');
      return;
    }
    setError('');
    setAdding(true);
    try {
      const userId = await resolveEmailToUserId(trimmed);
      if (!userId) {
        setError('No user found with that email');
        setAdding(false);
        return;
      }
      if (members.some((m) => m.userId === userId)) {
        setError('User already has access');
        setAdding(false);
        return;
      }
      await addMember(boardId, userId, role);
      setMembers((prev) => [...prev, { userId, role, addedAt: new Date() }]);
      setEmail('');
    } catch (e) {
      setError(messageFromCaught(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#002B4D', marginBottom: '16px', fontSize: '1.25rem' }}>Share whiteboard</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as BoardMemberRole)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            style={{
              padding: '8px 16px',
              background: '#002B4D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: adding ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        )}
        {loading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading members…</p>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#374151', fontSize: '14px', marginBottom: '8px' }}>People with access:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {members.map((m) => (
                <li
                  key={m.userId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: '#111827' }}>{m.userId}</span>
                  <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: '#e5e7eb',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
