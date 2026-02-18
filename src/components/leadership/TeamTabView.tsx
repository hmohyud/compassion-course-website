import React, { useState, useEffect } from 'react';
import {
  getWorkingAgreementsByTeam,
  updateWorkingAgreements,
} from '../../services/workingAgreementsService';
import {
  listTeamBacklog,
  updateWorkItem,
  createWorkItem,
  deleteWorkItem,
} from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from './TaskForm';
import type { LeadershipWorkItem } from '../../types/leadership';

interface TeamTabViewProps {
  teamId: string;
  teamName: string;
  memberIds: string[];
  memberLabels: Record<string, string>;
  memberAvatars?: Record<string, string>;
  /** All work items for this team (used to compute stats). */
  workItems?: LeadershipWorkItem[];
  onRefresh: () => void;
}

const TeamTabView: React.FC<TeamTabViewProps> = ({
  teamId,
  teamName,
  memberIds,
  memberLabels,
  memberAvatars = {},
  workItems = [],
  onRefresh,
}) => {
  const [agreementItems, setAgreementItems] = useState<string[]>([]);
  const [newAgreement, setNewAgreement] = useState('');
  const [savingAgreements, setSavingAgreements] = useState(false);
  const [backlogItems, setBacklogItems] = useState<LeadershipWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getWorkingAgreementsByTeam(teamId),
      listTeamBacklog(teamId),
    ])
      .then(([ag, backlog]) => {
        if (cancelled) return;
        setAgreementItems(ag?.items ?? []);
        setBacklogItems(backlog ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setAgreementItems([]);
          setBacklogItems([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  const loadBacklog = () => {
    listTeamBacklog(teamId).then(setBacklogItems).catch(() => {});
  };

  const handleAddAgreement = async () => {
    const text = newAgreement.trim();
    if (!text) return;
    const next = [...agreementItems, text];
    setAgreementItems(next);
    setNewAgreement('');
    setSavingAgreements(true);
    try {
      await updateWorkingAgreements(teamId, next);
    } finally {
      setSavingAgreements(false);
    }
  };

  const handleRemoveAgreement = async (index: number) => {
    const next = agreementItems.filter((_, i) => i !== index);
    setAgreementItems(next);
    setSavingAgreements(true);
    try {
      await updateWorkingAgreements(teamId, next);
    } finally {
      setSavingAgreements(false);
    }
  };

  const handleMoveToBoard = async (itemId: string) => {
    try {
      await updateWorkItem(itemId, { status: 'todo' });
      loadBacklog();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignMember = async (itemId: string, assigneeId: string) => {
    try {
      await updateWorkItem(itemId, { assigneeId: assigneeId || undefined });
      loadBacklog();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteWorkItem(itemId);
      setEditingItem(null);
      loadBacklog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    setSaveError(null);
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        teamId,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        assigneeIds: data.assigneeIds,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(created.id, data.title, teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setShowCreateForm(false);
      loadBacklog();
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
        assigneeIds: data.assigneeIds,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(editingItem.id, data.title, teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setEditingItem(null);
      loadBacklog();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  // Compute task stats from workItems
  const taskStats = {
    backlog: workItems.filter((w) => w.status === 'backlog').length,
    todo: workItems.filter((w) => w.status === 'todo').length,
    inProgress: workItems.filter((w) => w.status === 'in_progress').length,
    done: workItems.filter((w) => w.status === 'done').length,
    blocked: workItems.filter((w) => w.blocked).length,
    total: workItems.length,
  };

  if (loading) return <p className="ld-empty">Loading…</p>;

  return (
    <>
      {/* Team overview card */}
      <div className="ld-team-overview">
        <div className="ld-team-overview-header">
          <h2 className="ld-team-overview-name">{teamName}</h2>
          <span className="ld-team-overview-count">{memberIds.length} member{memberIds.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Member avatars */}
        <div className="ld-team-members-row">
          {memberIds.map((id) => (
            <div key={id} className="ld-team-member-card" title={memberLabels[id] || id}>
              {memberAvatars[id] ? (
                <img src={memberAvatars[id]} alt="" className="ld-team-member-avatar" />
              ) : (
                <span className="ld-team-member-initial">
                  {(memberLabels[id] || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="ld-team-member-name">{(memberLabels[id] || id).split(' ')[0]}</span>
            </div>
          ))}
          {memberIds.length === 0 && <span className="ld-empty">No members yet</span>}
        </div>

        {/* Task stats */}
        {taskStats.total > 0 && (
          <div className="ld-team-stats">
            <div className="ld-team-stat">
              <span className="ld-team-stat-num">{taskStats.total}</span>
              <span className="ld-team-stat-label">Total</span>
            </div>
            <div className="ld-team-stat ld-team-stat--backlog">
              <span className="ld-team-stat-num">{taskStats.backlog}</span>
              <span className="ld-team-stat-label">Backlog</span>
            </div>
            <div className="ld-team-stat ld-team-stat--todo">
              <span className="ld-team-stat-num">{taskStats.todo}</span>
              <span className="ld-team-stat-label">To Do</span>
            </div>
            <div className="ld-team-stat ld-team-stat--progress">
              <span className="ld-team-stat-num">{taskStats.inProgress}</span>
              <span className="ld-team-stat-label">In Progress</span>
            </div>
            <div className="ld-team-stat ld-team-stat--done">
              <span className="ld-team-stat-num">{taskStats.done}</span>
              <span className="ld-team-stat-label">Done</span>
            </div>
            {taskStats.blocked > 0 && (
              <div className="ld-team-stat ld-team-stat--blocked">
                <span className="ld-team-stat-num">{taskStats.blocked}</span>
                <span className="ld-team-stat-label">Blocked</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Working agreements */}
      <div className="ld-team-section">
        <h3 className="ld-team-section-title">Working agreements</h3>
        <ul className="ld-agreement-list">
          {agreementItems.map((item, i) => (
            <li key={i} className="ld-agreement-item">
              <span>{item}</span>
              <button type="button" className="ld-agreement-remove-btn" onClick={() => handleRemoveAgreement(i)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="ld-agreement-add-row">
          <input
            type="text"
            value={newAgreement}
            onChange={(e) => setNewAgreement(e.target.value)}
            placeholder="New agreement"
            className="ld-agreement-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddAgreement()}
          />
          <button
            type="button"
            className="ld-agreement-add-btn"
            onClick={handleAddAgreement}
            disabled={savingAgreements || !newAgreement.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {/* Team backlog */}
      <div className="ld-team-section">
        <h3 className="ld-team-section-title">Team backlog</h3>
        <p className="ld-backlog-desc">Items not yet on the board. Move to board to add to Planned work.</p>
        <button type="button" className="ld-backlog-add-btn" onClick={() => setShowCreateForm(true)}>
          Add to backlog
        </button>

        {showCreateForm && (
          <>
            {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
            <TaskForm
              mode="create"
              defaultLane="standard"
              teamId={teamId}
              teamMemberIds={memberIds}
              memberLabels={memberLabels}
              memberAvatars={memberAvatars}
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
              teamId={teamId}
              teamMemberIds={memberIds}
              memberLabels={memberLabels}
              memberAvatars={memberAvatars}
              onSave={handleEditSave}
              onCancel={() => { setEditingItem(null); setSaveError(null); }}
              onDelete={handleDelete}
            />
          </>
        )}

        {backlogItems.length === 0 ? (
          <p className="ld-empty">No items in team backlog.</p>
        ) : (
          <div>
            {backlogItems.map((item) => (
              <div key={item.id} className="ld-backlog-item">
                <div className="ld-backlog-item-title">{item.title}</div>
                <div className="ld-backlog-item-actions">
                  <button type="button" className="ld-btn-sm" onClick={() => setEditingItem(item)}>
                    Edit
                  </button>
                  <button type="button" className="ld-btn-sm ld-btn-sm--primary" onClick={() => handleMoveToBoard(item.id)}>
                    Move to board
                  </button>
                  <select
                    value={item.assigneeId || ''}
                    onChange={(e) => handleAssignMember(item.id, e.target.value)}
                    className="ld-select-sm"
                  >
                    <option value="">Assign to…</option>
                    {memberIds.map((uid) => (
                      <option key={uid} value={uid}>{memberLabels[uid] || uid}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default TeamTabView;
