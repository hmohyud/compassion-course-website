import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getWorkItem, updateWorkItem } from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import { getTeam } from '../../services/leadershipTeamsService';
import { getUserProfile } from '../../services/userProfileService';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../../components/leadership/TaskForm';
import type { LeadershipWorkItem } from '../../types/leadership';

const WorkItemDetailPage: React.FC = () => {
  const { workItemId } = useParams<{ workItemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<LeadershipWorkItem | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!workItemId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    getWorkItem(workItemId)
      .then((workItem) => {
        if (!workItem) {
          setItem(null);
          setNotFound(true);
          setMemberIds([]);
          setMemberLabels({});
          return;
        }
        setItem(workItem);
        if (workItem.teamId) {
          getTeam(workItem.teamId).then((team) => {
            const ids = team?.memberIds ?? [];
            setMemberIds(ids);
            if (ids.length === 0) {
              setMemberLabels({});
              return;
            }
            Promise.all(
              ids.map((uid) =>
                getUserProfile(uid).then((p) => [uid, p?.name || p?.email || uid] as const)
              )
            ).then((pairs) => setMemberLabels(Object.fromEntries(pairs)));
          });
        } else {
          setMemberIds([]);
          setMemberLabels({});
        }
      })
      .catch(() => {
        setItem(null);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [workItemId]);

  const backUrl = item?.teamId
    ? `/portal/leadership/teams/${item.teamId}/board`
    : '/portal/leadership/backlog';

  const handleSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!item) return;
    setSaveError(null);
    try {
      await updateWorkItem(item.id, {
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
              item.id,
              data.title,
              item.teamId,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
          }
        }
      }
      navigate(backUrl);
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleCancel = () => {
    navigate(backUrl);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <p style={{ color: '#6b7280' }}>Loading…</p>
        </div>
      </Layout>
    );
  }

  if (notFound || !item) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>
            ← Back to dashboard
          </Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Task not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to={backUrl}
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to {item.teamId ? 'team board' : 'backlog'}
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '20px', fontSize: '1.5rem', fontWeight: 700 }}>
          Task
        </h1>
        {saveError && (
          <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>
        )}
        <TaskForm
          mode="edit"
          initialItem={item}
          teamId={item.teamId}
          teamMemberIds={memberIds}
          memberLabels={memberLabels}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default WorkItemDetailPage;
