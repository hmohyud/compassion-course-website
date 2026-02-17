import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../../components/leadership/TaskForm';
import {
  listAllBacklogStatusItems,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
} from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import { listTeams, getTeam } from '../../services/leadershipTeamsService';
import { getUserProfile } from '../../services/userProfileService';
import type { LeadershipWorkItem } from '../../types/leadership';
import type { LeadershipTeam } from '../../types/leadership';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
  fontSize: '0.9rem',
  color: '#111827',
};

const LeadershipMainBacklogPage: React.FC = () => {
  const [items, setItems] = useState<LeadershipWorkItem[]>([]);
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; label: string }[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [backlog, teamList] = await Promise.all([
        listAllBacklogStatusItems(),
        listTeams(),
      ]);
      setItems(backlog);
      setTeams(teamList);
    } catch {
      setItems([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!assignTeamId) {
      setTeamMembers([]);
      setAssigneeId('');
      return;
    }
    getTeam(assignTeamId).then((team) => {
      if (!team) {
        setTeamMembers([]);
        return;
      }
      Promise.all(
        team.memberIds.map((uid) =>
          getUserProfile(uid).then((p) => ({
            id: uid,
            label: p?.name || p?.email || uid,
          }))
        )
      ).then(setTeamMembers);
      setAssigneeId('');
    }).catch(() => setTeamMembers([]));
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
        blocked: data.blocked,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              created.id,
              data.title,
              undefined,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
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
        blocked: data.blocked,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              editingItem.id,
              data.title,
              editingItem.teamId,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
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

  const handleDeleteItem = async (item: LeadershipWorkItem) => {
    if (!window.confirm(`Delete task "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteWorkItem(item.id);
      if (editingItem?.id === item.id) setEditingItem(null);
      load();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/leadership"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Leadership Portal
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>Backlog</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '20px' }}>
          All tasks in Backlog state, from any team or unassigned.
        </p>

        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '10px 20px',
            background: '#002B4D',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          Add task
        </button>

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
              onDelete={async () => {
                if (!editingItem || !window.confirm(`Delete task "${editingItem.title}"? This cannot be undone.`)) return;
                try {
                  await deleteWorkItem(editingItem.id);
                  setEditingItem(null);
                  setSaveError(null);
                  load();
                } catch (err) {
                  console.error(err);
                  setSaveError(err instanceof Error ? err.message : 'Failed to delete task');
                }
              }}
            />
          </>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No tasks in Backlog state.</p>
        ) : (
          <div>
            {items.map((item) => {
              const team = item.teamId ? teams.find((t) => t.id === item.teamId) : null;
              const hasTeam = Boolean(item.teamId && item.teamId !== '');
              return (
                <div key={item.id} style={cardStyle}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.title}</div>
                  {item.description && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>
                      {item.description}
                    </div>
                  )}
                  {hasTeam && team && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>
                      Team: <Link to={`/portal/leadership/teams/${item.teamId}/board`} style={{ color: '#002B4D', fontWeight: 500, textDecoration: 'underline' }}>{team.name}</Link>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.8rem',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.8rem',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                    {!hasTeam && (assigningId === item.id ? (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={assignTeamId}
                          onChange={(e) => setAssignTeamId(e.target.value)}
                          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                          <option value="">Select team</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {teamMembers.length > 0 && (
                          <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                          >
                            <option value="">No assignee</option>
                            {teamMembers.map((m) => (
                              <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAssignToTeam(item.id)}
                          disabled={!assignTeamId}
                          style={{
                            padding: '6px 12px',
                            background: assignTeamId ? '#002B4D' : '#9ca3af',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: assignTeamId ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                          }}
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAssigningId(null); setAssignTeamId(''); setAssigneeId(''); }}
                          style={{
                            padding: '6px 12px',
                            background: '#fff',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssigningId(item.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          background: '#e5e7eb',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#374151',
                        }}
                      >
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
    </Layout>
  );
};

export default LeadershipMainBacklogPage;
