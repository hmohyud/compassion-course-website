import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../../components/leadership/TaskForm';
import { getTeam } from '../../services/leadershipTeamsService';
import {
  getWorkingAgreementsByTeam,
  updateWorkingAgreements,
} from '../../services/workingAgreementsService';
import {
  listTeamBacklog,
  updateWorkItem,
  createWorkItem,
} from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import { getUserProfile } from '../../services/userProfileService';
import type { LeadershipTeam } from '../../types/leadership';
import type { LeadershipWorkItem } from '../../types/leadership';

const sectionStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  marginBottom: '24px',
};

const LeadershipTeamPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<LeadershipTeam | null>(null);
  const [agreementItems, setAgreementItems] = useState<string[]>([]);
  const [newAgreement, setNewAgreement] = useState('');
  const [backlogItems, setBacklogItems] = useState<LeadershipWorkItem[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingAgreements, setSavingAgreements] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBacklogItem, setEditingBacklogItem] = useState<LeadershipWorkItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getTeam(teamId),
      getWorkingAgreementsByTeam(teamId),
      listTeamBacklog(teamId),
    ])
      .then(([t, ag, backlog]) => {
        if (cancelled) return;
        setTeam(t ?? null);
        setAgreementItems(ag?.items ?? []);
        setBacklogItems(backlog ?? []);
        if (t) {
          Promise.all(
            t.memberIds.map((uid) =>
              getUserProfile(uid).then((p) => [uid, p?.name || p?.email || uid] as const)
            )
          ).then((pairs) => {
            if (!cancelled) {
              setMemberLabels(Object.fromEntries(pairs));
            }
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeam(null);
          setAgreementItems([]);
          setBacklogItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const loadBacklog = () => {
    if (!teamId) return;
    listTeamBacklog(teamId).then(setBacklogItems);
  };

  const handleAddAgreement = async () => {
    const text = newAgreement.trim();
    if (!text || !teamId) return;
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
    if (!teamId) return;
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

  const handleCreateBacklogSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!teamId) return;
    setSaveError(null);
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        teamId,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        blocked: data.blocked,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              created.id,
              data.title,
              teamId,
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
      loadBacklog();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleEditBacklogSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!editingBacklogItem) return;
    setSaveError(null);
    try {
      await updateWorkItem(editingBacklogItem.id, {
        title: data.title,
        description: data.description,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        blocked: data.blocked,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              editingBacklogItem.id,
              data.title,
              teamId ?? undefined,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
          }
        }
      }
      setEditingBacklogItem(null);
      loadBacklog();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  if (!teamId || (!loading && !team)) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>
            ← Back to Leadership Portal
          </Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/leadership"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Leadership Portal
        </Link>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : team ? (
          <>
            <h1 style={{ color: '#002B4D', marginBottom: '8px' }}>{team.name}</h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '24px' }}>
              Members: {team.memberIds.length === 0
                ? 'None'
                : team.memberIds.map((id) => memberLabels[id] || id).join(', ')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              <Link
                to={`/portal/leadership/teams/${teamId}/board`}
                style={{
                  padding: '10px 20px',
                  background: '#002B4D',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Team board
              </Link>
              <Link
                to="/whiteboards"
                style={{
                  padding: '10px 20px',
                  background: '#002B4D',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Whiteboards
              </Link>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.25rem' }}>Working agreements</h2>
              <ul style={{ margin: '0 0 16px', paddingLeft: '20px', color: '#374151' }}>
                {agreementItems.map((item, i) => (
                  <li key={i} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAgreement(i)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newAgreement}
                  onChange={(e) => setNewAgreement(e.target.value)}
                  placeholder="New agreement"
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAgreement()}
                />
                <button
                  type="button"
                  onClick={handleAddAgreement}
                  disabled={savingAgreements || !newAgreement.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#002B4D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: savingAgreements ? 'not-allowed' : 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.25rem' }}>Team backlog</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '12px' }}>
                Items not yet on the board. Move to board to add to To Do.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                Add to backlog
              </button>
              {showCreateForm && teamId && (
                <>
                  {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
                  <TaskForm
                    mode="create"
                    defaultLane="standard"
                    teamId={teamId}
                    teamMemberIds={team?.memberIds ?? []}
                    memberLabels={memberLabels}
                    onSave={handleCreateBacklogSave}
                    onCancel={() => { setShowCreateForm(false); setSaveError(null); }}
                  />
                </>
              )}
              {editingBacklogItem && (
                <>
                  {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
                  <TaskForm
                    mode="edit"
                    initialItem={editingBacklogItem}
                    teamId={teamId}
                    teamMemberIds={team?.memberIds ?? []}
                    memberLabels={memberLabels}
                    onSave={handleEditBacklogSave}
                    onCancel={() => { setEditingBacklogItem(null); setSaveError(null); }}
                  />
                </>
              )}
              {backlogItems.length === 0 ? (
                <p style={{ color: '#6b7280', margin: 0 }}>No items in team backlog.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {backlogItems.map((item) => (
                    <li key={item.id} style={{ marginBottom: '12px' }}>
                      <span style={{ fontWeight: 500 }}>{item.title}</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setEditingBacklogItem(item)}
                          style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveToBoard(item.id)}
                          style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#002B4D', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Move to board
                        </button>
                        <select
                          value={item.assigneeId || ''}
                          onChange={(e) => handleAssignMember(item.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          <option value="">Assign to…</option>
                          {team.memberIds.map((uid) => (
                            <option key={uid} value={uid}>{memberLabels[uid] || uid}</option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default LeadershipTeamPage;
