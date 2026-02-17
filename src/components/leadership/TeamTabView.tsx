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
  onRefresh: () => void;
}

const TeamTabView: React.FC<TeamTabViewProps> = ({
  teamId,
  teamName,
  memberIds,
  memberLabels,
  memberAvatars = {},
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
        type: data.type,
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
        type: data.type,
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

  if (loading) return <p className="ld-empty">Loading…</p>;

  return (
    <>
      <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.25rem' }}>{teamName}</h2>
      <p className="ld-team-members-text">
        Members: {memberIds.length === 0
          ? 'None'
          : memberIds.map((id) => memberLabels[id] || id).join(', ')}
      </p>

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
