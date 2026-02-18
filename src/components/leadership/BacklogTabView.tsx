import React, { useState, useEffect } from 'react';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from './TaskForm';
import {
  listAllBacklogStatusItems,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
} from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import { getTeam } from '../../services/leadershipTeamsService';
import { getUserProfile } from '../../services/userProfileService';
import type { LeadershipWorkItem, LeadershipTeam } from '../../types/leadership';

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

interface BacklogTabViewProps {
  teams: LeadershipTeam[];
  onSwitchToTeamBoard: (teamId: string) => void;
}

const BacklogTabView: React.FC<BacklogTabViewProps> = ({ teams, onSwitchToTeamBoard }) => {
  const [items, setItems] = useState<LeadershipWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; label: string }[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listAllBacklogStatusItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Load team members when assigning
  useEffect(() => {
    if (!assignTeamId) {
      setTeamMembers([]);
      setAssigneeId('');
      return;
    }
    let cancelled = false;
    getTeam(assignTeamId).then((team) => {
      if (cancelled || !team) { setTeamMembers([]); return; }
      Promise.all(
        team.memberIds.map((uid) =>
          getUserProfile(uid).then((p) => ({ id: uid, label: p?.name || p?.email || uid }))
        )
      ).then((members) => { if (!cancelled) setTeamMembers(members); });
      setAssigneeId('');
    }).catch(() => { if (!cancelled) setTeamMembers([]); });
    return () => { cancelled = true; };
  }, [assignTeamId]);

  const handleCreateSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    setSaveError(null);
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(created.id, data.title, undefined, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setShowCreateForm(false);
      load();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleEditSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!editingItem) return;
    setSaveError(null);
    try {
      await updateWorkItem(editingItem.id, {
        title: data.title,
        description: data.description,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(editingItem.id, data.title, editingItem.teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setEditingItem(null);
      load();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteWorkItem(itemId);
      setEditingItem(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignToTeam = async (itemId: string) => {
    if (!assignTeamId) return;
    try {
      await updateWorkItem(itemId, {
        teamId: assignTeamId,
        assigneeId: assigneeId || undefined,
        status: 'backlog',
      });
      setAssigningId(null);
      setAssignTeamId('');
      setAssigneeId('');
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ld-backlog-sections">
      <div>
        <h2 className="ld-backlog-section-title">Global Backlog</h2>
        <p className="ld-backlog-desc">All tasks in Backlog status, from any team or unassigned.</p>
        <button type="button" className="ld-backlog-add-btn" onClick={() => setShowCreateForm(true)}>
          Add task
        </button>
      </div>

      {showCreateForm && (
        <>
          {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
          <TaskForm
            mode="create"
            onSave={handleCreateSave}
            onCancel={() => { setShowCreateForm(false); setSaveError(null); }}
          />
        </>
      )}
      {editingItem && (
        <>
          {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
          <TaskForm
            mode="edit"
            initialItem={editingItem}
            onSave={handleEditSave}
            onCancel={() => { setEditingItem(null); setSaveError(null); }}
            onDelete={handleDelete}
          />
        </>
      )}

      {loading ? (
        <p className="ld-empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="ld-empty">No tasks in Backlog status.</p>
      ) : (
        <div>
          {items.map((item) => {
            const team = item.teamId ? teams.find((t) => t.id === item.teamId) : null;
            const hasTeam = Boolean(item.teamId && item.teamId !== '');
            return (
              <div key={item.id} className="ld-backlog-item">
                <div className="ld-backlog-item-header">
                  <div className="ld-backlog-item-title">{item.title}</div>
                  <span className="ld-backlog-item-time">
                    Created {formatTimeAgo(item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt))}
                  </span>
                </div>
                {item.description && <div className="ld-backlog-item-desc">{item.description}</div>}
                {hasTeam && team && (
                  <div className="ld-backlog-item-team">
                    Team:{' '}
                    <button
                      type="button"
                      className="ld-btn-sm ld-btn-sm--primary"
                      onClick={() => onSwitchToTeamBoard(item.teamId!)}
                    >
                      {team.name}
                    </button>
                  </div>
                )}
                <div className="ld-backlog-item-actions">
                  <button type="button" className="ld-btn-sm" onClick={() => setEditingItem(item)}>
                    Edit
                  </button>
                  {!hasTeam && (assigningId === item.id ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <select value={assignTeamId} onChange={(e) => setAssignTeamId(e.target.value)} className="ld-select-sm">
                        <option value="">Select team</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      {teamMembers.length > 0 && (
                        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="ld-select-sm">
                          <option value="">No assignee</option>
                          {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      )}
                      <button type="button" className="ld-btn-sm ld-btn-sm--primary" onClick={() => handleAssignToTeam(item.id)} disabled={!assignTeamId}>
                        Assign
                      </button>
                      <button type="button" className="ld-btn-sm" onClick={() => { setAssigningId(null); setAssignTeamId(''); setAssigneeId(''); }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="ld-btn-sm" onClick={() => setAssigningId(item.id)}>
                      Assign to team…
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BacklogTabView;
