import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listUserProfiles } from '../../services/userProfileService';
import type { UserProfile } from '../../types/platform';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane, WorkItemComment } from '../../types/leadership';

const STATUS_OPTIONS: { value: WorkItemStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: '#6b7280' },
  { value: 'todo', label: 'To Do', color: '#f59e0b' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'done', label: 'Done', color: '#22c55e' },
];

const LANE_OPTIONS: { value: WorkItemLane; label: string; icon: string; desc: string; color: string }[] = [
  { value: 'expedited', label: 'Urgent', icon: 'fas fa-bolt', desc: 'Drop everything — fix now', color: '#ef4444' },
  { value: 'fixed_date', label: 'Deadline', icon: 'fas fa-calendar-day', desc: 'Must ship by a specific date', color: '#f59e0b' },
  { value: 'standard', label: 'Standard', icon: 'fas fa-stream', desc: 'Normal priority work', color: '#3b82f6' },
  { value: 'intangible', label: 'Unknown', icon: 'fas fa-wrench', desc: 'Unknown or uncategorized', color: '#8b5cf6' },
];

const ESTIMATE_OPTIONS = [0.5, 1, 1.5, 2, 3, 5];

export type TaskFormPayload = {
  title: string;
  description?: string;
  status: WorkItemStatus;
  lane: WorkItemLane;
  estimate?: number;
  blocked?: boolean;
  assigneeId?: string;
  assigneeIds?: string[];
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
  /** Default status when mode is 'create'. */
  defaultStatus?: WorkItemStatus;
  teamId?: string;
  teamMemberIds?: string[];
  memberLabels?: Record<string, string>;
  memberAvatars?: Record<string, string>;
  onSave: (data: TaskFormPayload, context?: TaskFormSaveContext) => void;
  onCancel: () => void;
  /** Called when user clicks Delete (edit mode only). Confirm before calling. */
  onDelete?: (itemId: string) => void;
  /** Called immediately when comments change in edit mode (add/edit/delete).
   *  Persists comments without requiring the user to click "Save Changes". */
  onCommentsChanged?: (comments: WorkItemComment[], context?: TaskFormSaveContext) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  mode,
  initialItem,
  defaultLane = 'standard',
  defaultStatus,
  teamId,
  teamMemberIds = [],
  memberLabels = {},
  memberAvatars = {},
  onSave,
  onCancel,
  onDelete,
  onCommentsChanged,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('todo');
  const [lane, setLane] = useState<WorkItemLane>(defaultLane);
  const [estimate, setEstimate] = useState<number | ''>('');
  const [blocked, setBlocked] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<WorkItemComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentCommentMentionedIds, setCurrentCommentMentionedIds] = useState<string[]>([]);
  const [mentionableProfiles, setMentionableProfiles] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);
  const addedCommentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    listUserProfiles()
      .then((profiles) => {
        const mentionable = profiles.filter(
          (p) => p.role === 'manager' || p.role === 'admin' || p.role === 'contributor' || p.role === 'viewer'
        );
        setMentionableProfiles(mentionable);
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
      setAssigneeIds(initialItem.assigneeIds?.filter(Boolean) ?? (initialItem.assigneeId ? [initialItem.assigneeId] : []));
      setComments(initialItem.comments ?? []);
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus ?? 'todo');
      setLane(defaultLane);
      setEstimate('');
      setBlocked(false);
      setAssigneeIds([]);
      setComments([]);
    }
    setConfirmDelete(false);
  }, [mode, initialItem, defaultLane, defaultStatus]);

  const mentionQueryStart = useMemo(() => {
    const before = newCommentText.slice(0, cursorPosition);
    return before.lastIndexOf('@');
  }, [newCommentText, cursorPosition]);

  const mentionQuery =
    mentionQueryStart >= 0
      ? newCommentText.slice(mentionQueryStart + 1, cursorPosition).trim()
      : '';

  const mentionCandidates = useMemo(() => {
    if (!mentionQuery) return mentionableProfiles.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return mentionableProfiles
      .filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [mentionableProfiles, mentionQuery]);

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
          blocked: mode === 'edit' ? blocked : undefined,
          assigneeId: assigneeIds[0] || undefined,
          assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
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
    const newComment: WorkItemComment = {
      id,
      userId: user.uid,
      userName: user.displayName || user.email || undefined,
      text,
      createdAt: new Date(),
      ...(mentionedUserIds?.length ? { mentionedUserIds } : {}),
    };
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setNewCommentText('');
    setCurrentCommentMentionedIds([]);

    // In edit mode, persist immediately so user doesn't need to click "Save Changes"
    if (mode === 'edit' && onCommentsChanged) {
      const mentionContext = mentionedUserIds?.length
        ? { newCommentsWithMentions: [newComment] }
        : undefined;
      onCommentsChanged(updatedComments, mentionContext);
    }
  };

  const startEditComment = (c: WorkItemComment) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.text);
    setDeletingCommentId(null);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEditComment = () => {
    if (!editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;
    const updatedComments = comments.map((c) =>
      c.id === editingCommentId
        ? { ...c, text: trimmed, editedAt: new Date() }
        : c
    );
    setComments(updatedComments);
    setEditingCommentId(null);
    setEditingCommentText('');

    // In edit mode, persist immediately
    if (mode === 'edit' && onCommentsChanged) {
      onCommentsChanged(updatedComments);
    }
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const confirmDeleteComment = (commentId: string) => {
    setDeletingCommentId(commentId);
    setEditingCommentId(null);
  };

  const executeDeleteComment = () => {
    if (!deletingCommentId) return;
    const updatedComments = comments.filter((c) => c.id !== deletingCommentId);
    setComments(updatedComments);
    addedCommentIdsRef.current.delete(deletingCommentId);
    setDeletingCommentId(null);

    // In edit mode, persist immediately
    if (mode === 'edit' && onCommentsChanged) {
      onCommentsChanged(updatedComments);
    }
  };

  const formatCommentDate = (d: Date | undefined) => {
    if (!d || !(d instanceof Date)) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const uniqueId = mode === 'edit' && initialItem ? initialItem.id : null;

  return (
    <div className="tf-backdrop" onClick={onCancel}>
      <div className="tf-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tf-header">
          <h2 className="tf-title">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          <button type="button" className="tf-close-btn" onClick={onCancel} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Subtle metadata row */}
        {uniqueId && (
          <div className="tf-meta">
            <span className="tf-meta-label">ID:</span>
            <span className="tf-meta-value">{uniqueId}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="tf-field">
            <label className="tf-label" htmlFor="tf-title">Title</label>
            <input
              id="tf-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="What needs to be done?"
              className="tf-input"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="tf-field">
            <label className="tf-label" htmlFor="tf-desc">Description</label>
            <textarea
              id="tf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, context, or acceptance criteria…"
              rows={3}
              className="tf-input tf-textarea"
            />
          </div>

          {/* Blocked (edit mode only) */}
          {mode === 'edit' && (
            <div className="tf-field">
              <label className="tf-label tf-label--checkbox">
                <input
                  type="checkbox"
                  checked={blocked}
                  onChange={(e) => setBlocked(e.target.checked)}
                  className="tf-checkbox"
                />
                Blocked
              </label>
            </div>
          )}

          {/* Status toggle buttons */}
          <div className="tf-field">
            <label className="tf-label">Status</label>
            <div className="tf-status-group">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`tf-status-btn ${status === o.value ? 'tf-status-btn--active' : ''}`}
                  onClick={() => setStatus(o.value)}
                  style={status === o.value ? { borderColor: o.color, color: o.color, background: `${o.color}0d` } : undefined}
                >
                  <span
                    className="tf-status-dot"
                    style={{ background: o.color }}
                  />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Estimate row */}
          <div className="tf-row">
            <div className="tf-field tf-field--half">
              <label className="tf-label">Priority</label>
              <div className="tf-lane-group">
                {LANE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`tf-lane-btn ${lane === o.value ? 'tf-lane-btn--active' : ''}`}
                    onClick={() => setLane(o.value)}
                    title={o.desc}
                    style={lane === o.value ? { borderColor: o.color, color: o.color, background: `${o.color}0d` } : undefined}
                  >
                    <i className={o.icon} style={{ fontSize: '0.7rem', color: o.color }}></i>
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="tf-field tf-field--half">
              <label className="tf-label" htmlFor="tf-estimate">Estimate</label>
              <select
                id="tf-estimate"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value === '' ? '' : Number(e.target.value))}
                className="tf-input tf-select"
              >
                <option value="">No estimate</option>
                {ESTIMATE_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v} {v === 1 ? 'day' : 'days'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignees (inline avatar toggles) */}
          {teamMemberIds.length > 0 && (
            <div className="tf-field">
              <label className="tf-label">Assignees</label>
              <div className="tf-assignee-grid">
                {teamMemberIds.map((id) => {
                  const isSelected = assigneeIds.includes(id);
                  const name = memberLabels[id] || id;
                  const firstName = name.split(' ')[0];
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`tf-assignee-toggle ${isSelected ? 'tf-assignee-toggle--active' : ''}`}
                      onClick={() =>
                        setAssigneeIds((prev) =>
                          isSelected ? prev.filter((x) => x !== id) : [...prev, id]
                        )
                      }
                      title={name}
                    >
                      <span className="tf-assignee-toggle-avatar-wrap">
                        {memberAvatars[id] ? (
                          <img src={memberAvatars[id]} alt="" className="tf-assignee-toggle-avatar" />
                        ) : (
                          <span className="tf-assignee-toggle-initial">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        {isSelected && (
                          <span className="tf-assignee-toggle-check">
                            <i className="fas fa-check"></i>
                          </span>
                        )}
                      </span>
                      <span className="tf-assignee-toggle-name">{firstName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="tf-field">
            <label className="tf-label">Comments {comments.length > 0 && <span className="tf-comment-count">{comments.length}</span>}</label>
            {comments.length > 0 && (
              <div className="tf-comments-list">
                {comments.map((c) => {
                  const isOwn = user?.uid === c.userId;
                  const isEditing = editingCommentId === c.id;
                  const isDeleting = deletingCommentId === c.id;
                  return (
                    <div key={c.id} className={`tf-comment ${isDeleting ? 'tf-comment--deleting' : ''}`}>
                      <div className="tf-comment-header">
                        <strong className="tf-comment-author">{c.userName || c.userId}</strong>
                        <span className="tf-comment-date">{formatCommentDate(c.createdAt)}</span>
                        {isOwn && !isEditing && !isDeleting && (
                          <span className="tf-comment-actions">
                            <button
                              type="button"
                              className="tf-comment-action-btn"
                              onClick={() => startEditComment(c)}
                              title="Edit comment"
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            <button
                              type="button"
                              className="tf-comment-action-btn tf-comment-action-btn--danger"
                              onClick={() => confirmDeleteComment(c.id)}
                              title="Delete comment"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </span>
                        )}
                      </div>
                      {isDeleting ? (
                        <div className="tf-comment-delete-confirm">
                          <span className="tf-comment-delete-prompt">Delete this comment?</span>
                          <button type="button" className="tf-comment-delete-yes" onClick={executeDeleteComment}>
                            Yes
                          </button>
                          <button type="button" className="tf-comment-delete-no" onClick={() => setDeletingCommentId(null)}>
                            No
                          </button>
                        </div>
                      ) : isEditing ? (
                        <div className="tf-comment-edit-wrap">
                          <textarea
                            ref={editInputRef}
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="tf-input tf-textarea tf-comment-edit-input"
                            rows={2}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditComment(); }
                              if (e.key === 'Escape') cancelEditComment();
                            }}
                          />
                          <div className="tf-comment-edit-actions">
                            <button type="button" className="tf-comment-edit-save" onClick={saveEditComment} disabled={!editingCommentText.trim()}>
                              Save
                            </button>
                            <button type="button" className="tf-comment-edit-cancel" onClick={cancelEditComment}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="tf-comment-text">{c.text}</div>
                          {c.editedAt && (
                            <div className="tf-comment-footer">
                              <span className="tf-comment-edited" title={`Edited ${formatCommentDate(c.editedAt)}`}>edited</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="tf-comment-input-wrap">
              <textarea
                ref={commentInputRef}
                value={newCommentText}
                onChange={(e) => {
                  setNewCommentText(e.target.value);
                  setCursorPosition(e.target.selectionStart ?? 0);
                }}
                onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart ?? 0)}
                onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart ?? 0)}
                placeholder="Add a comment… (type @ to mention)"
                rows={2}
                className="tf-input tf-textarea"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              {showMentionDropdown && (
                <ul className="tf-mention-dropdown">
                  {mentionCandidates.map((p) => (
                    <li
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      className="tf-mention-item"
                      onClick={() => insertMention(p)}
                      onKeyDown={(e) => e.key === 'Enter' && insertMention(p)}
                    >
                      {p.name || p.email || p.id}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="tf-comment-add-btn"
                onClick={addComment}
                disabled={!user}
                style={{ visibility: newCommentText.trim() ? 'visible' : 'hidden' }}
              >
                Post comment
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="tf-footer">
            <div className="tf-footer-left">
              <button type="submit" className="tf-btn tf-btn--primary" disabled={saving || deleting || !title.trim()}>
                {saving ? 'Saving…' : mode === 'create' ? 'Create Task' : 'Save Changes'}
              </button>
              <button type="button" className="tf-btn tf-btn--ghost" onClick={onCancel} disabled={deleting}>
                Cancel
              </button>
            </div>
            {mode === 'edit' && onDelete && initialItem && (
              <div className="tf-footer-right">
                {!confirmDelete ? (
                  <button
                    type="button"
                    className="tf-btn tf-btn--danger-ghost"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleting}
                  >
                    <i className="fas fa-trash-alt"></i> Delete
                  </button>
                ) : (
                  <div className="tf-delete-confirm">
                    <span className="tf-delete-prompt">Delete this task?</span>
                    <button
                      type="button"
                      className="tf-btn tf-btn--danger"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete(initialItem.id);
                        } finally {
                          setDeleting(false);
                        }
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      type="button"
                      className="tf-btn tf-btn--ghost"
                      onClick={() => setConfirmDelete(false)}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
