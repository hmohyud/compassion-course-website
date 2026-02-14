import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listUserProfiles } from '../../services/userProfileService';
import type { UserProfile } from '../../types/platform';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane, WorkItemComment } from '../../types/leadership';

const STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Planned work' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const LANE_OPTIONS: { value: WorkItemLane; label: string }[] = [
  { value: 'expedited', label: 'Expedited' },
  { value: 'fixed_date', label: 'Fixed Date' },
  { value: 'standard', label: 'Standard' },
  { value: 'intangible', label: 'Intangible' },
];

const ESTIMATE_OPTIONS = [0.5, 1, 1.5, 2];

export type TaskFormPayload = {
  title: string;
  description?: string;
  status: WorkItemStatus;
  lane: WorkItemLane;
  estimate?: number;
  blocked: boolean;
  assigneeId?: string;
  teamId?: string;
  comments?: WorkItemComment[];
};

export interface TaskFormSaveContext {
  /** Comments added in this session that contain @-mentions (for creating notifications). */
  newCommentsWithMentions: WorkItemComment[];
}

export interface TaskFormProps {
  mode: 'create' | 'edit';
  initialItem?: LeadershipWorkItem | null;
  defaultLane?: WorkItemLane;
  teamId?: string;
  teamMemberIds?: string[];
  memberLabels?: Record<string, string>;
  onSave: (data: TaskFormPayload, context?: TaskFormSaveContext) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
};

export const TaskForm: React.FC<TaskFormProps> = ({
  mode,
  initialItem,
  defaultLane = 'standard',
  teamId,
  teamMemberIds = [],
  memberLabels = {},
  onSave,
  onCancel,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('backlog');
  const [lane, setLane] = useState<WorkItemLane>(defaultLane);
  const [estimate, setEstimate] = useState<number | ''>('');
  const [blocked, setBlocked] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [comments, setComments] = useState<WorkItemComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentCommentMentionedIds, setCurrentCommentMentionedIds] = useState<string[]>([]);
  const [managerAdminProfiles, setManagerAdminProfiles] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const addedCommentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    listUserProfiles()
      .then((profiles) => {
        const managerAdmin = profiles.filter(
          (p) => p.role === 'manager' || p.role === 'admin'
        );
        setManagerAdminProfiles(managerAdmin);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === 'edit' && initialItem) {
      setTitle(initialItem.title);
      setDescription(initialItem.description ?? '');
      setStatus(initialItem.status);
      setLane(initialItem.lane ?? 'standard');
      setEstimate(initialItem.estimate ?? '');
      setBlocked(initialItem.blocked ?? false);
      setAssigneeId(initialItem.assigneeId ?? '');
      setComments(initialItem.comments ?? []);
    } else {
      setTitle('');
      setDescription('');
      setStatus('backlog');
      setLane(defaultLane);
      setEstimate('');
      setBlocked(false);
      setAssigneeId('');
      setComments([]);
    }
  }, [mode, initialItem, defaultLane]);

  const mentionQueryStart = useMemo(() => {
    const before = newCommentText.slice(0, cursorPosition);
    return before.lastIndexOf('@');
  }, [newCommentText, cursorPosition]);

  const mentionQuery =
    mentionQueryStart >= 0
      ? newCommentText.slice(mentionQueryStart + 1, cursorPosition).trim()
      : '';

  const mentionCandidates = useMemo(() => {
    if (!mentionQuery) return managerAdminProfiles.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return managerAdminProfiles
      .filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [managerAdminProfiles, mentionQuery]);

  const showMentionDropdown = mentionQueryStart >= 0 && mentionCandidates.length > 0;

  const insertMention = (profile: UserProfile) => {
    const displayName = profile.name?.trim() || profile.email || profile.id;
    const before = newCommentText.slice(0, mentionQueryStart);
    const after = newCommentText.slice(cursorPosition);
    const inserted = `${before}@${displayName} ${after}`;
    setNewCommentText(inserted);
    setCurrentCommentMentionedIds((prev) =>
      prev.includes(profile.id) ? prev : [...prev, profile.id]
    );
    const newPos = mentionQueryStart + 1 + displayName.length + 1;
    setCursorPosition(newPos);
    setTimeout(() => {
      commentInputRef.current?.focus();
      commentInputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newCommentsWithMentions = comments.filter(
        (c) => addedCommentIdsRef.current.has(c.id) && c.mentionedUserIds?.length
      );
      onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          lane,
          estimate: estimate === '' ? undefined : Number(estimate),
          blocked,
          assigneeId: assigneeId || undefined,
          teamId,
          comments: comments.length > 0 ? comments : undefined,
        },
        newCommentsWithMentions.length
          ? { newCommentsWithMentions }
          : undefined
      );
      addedCommentIdsRef.current.clear();
    } finally {
      setSaving(false);
    }
  };

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text || !user) return;
    const mentionedUserIds =
      currentCommentMentionedIds.length > 0 ? [...currentCommentMentionedIds] : undefined;
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addedCommentIdsRef.current.add(id);
    setComments((prev) => [
      ...prev,
      {
        id,
        userId: user.uid,
        userName: user.displayName || user.email || undefined,
        text,
        createdAt: new Date(),
        ...(mentionedUserIds?.length ? { mentionedUserIds } : {}),
      },
    ]);
    setNewCommentText('');
    setCurrentCommentMentionedIds([]);
  };

  const uniqueId = mode === 'edit' && initialItem ? initialItem.id : '—';

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
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '520px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: '#002B4D', marginBottom: '20px', fontSize: '1.25rem' }}>
          {mode === 'create' ? 'Create Task' : 'Edit Task'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Unique ID</label>
            <input type="text" value={uniqueId} readOnly style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Type</label>
            <input type="text" value="Task" readOnly style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Name *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Task name"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Comments</label>
            {comments.length > 0 && (
              <ul style={{ margin: '0 0 8px', paddingLeft: '20px', fontSize: '0.875rem', color: '#374151' }}>
                {comments.map((c) => (
                  <li key={c.id} style={{ marginBottom: '4px' }}>
                    <strong>{c.userName || c.userId}</strong> ({c.createdAt.toLocaleString()}): {c.text}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ position: 'relative', flex: 1 }}>
              <textarea
                ref={commentInputRef}
                value={newCommentText}
                onChange={(e) => {
                  setNewCommentText(e.target.value);
                  setCursorPosition(e.target.selectionStart ?? 0);
                }}
                onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart ?? 0)}
                onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart ?? 0)}
                placeholder="Add a comment (type @ to mention manager/admin)"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              {showMentionDropdown && (
                <ul
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '100%',
                    margin: 0,
                    marginTop: '4px',
                    padding: '4px 0',
                    listStyle: 'none',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    minWidth: '200px',
                  }}
                >
                  {mentionCandidates.map((p) => (
                    <li
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => insertMention(p)}
                      onKeyDown={(e) => e.key === 'Enter' && insertMention(p)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                      }}
                    >
                      {p.name || p.email || p.id}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={addComment} disabled={!user} style={{ marginTop: '8px', padding: '8px 14px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: user ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Add comment
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as WorkItemStatus)} style={inputStyle}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lane</label>
            <select value={lane} onChange={(e) => setLane(e.target.value as WorkItemLane)} style={inputStyle}>
              {LANE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Estimate (days)</label>
            <select
              value={estimate}
              onChange={(e) => setEstimate(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
            >
              <option value="">—</option>
              {ESTIMATE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="task-form-blocked"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
            />
            <label htmlFor="task-form-blocked" style={{ ...labelStyle, marginBottom: 0 }}>Blocked</label>
          </div>

          {teamMemberIds.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputStyle}>
                <option value="">No assignee</option>
                {teamMemberIds.map((id) => (
                  <option key={id} value={id}>{memberLabels[id] || id}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
