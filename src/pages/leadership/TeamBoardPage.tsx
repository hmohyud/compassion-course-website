import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { listWorkItems, updateWorkItem } from '../../services/leadershipWorkItemsService';
import { getTeam } from '../../services/leadershipTeamsService';
import type { LeadershipWorkItem, WorkItemStatus } from '../../types/leadership';

const KANBAN_STATUSES: WorkItemStatus[] = ['todo', 'in_progress', 'done'];
const COLUMNS: { id: WorkItemStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '8px',
  fontSize: '0.9rem',
  color: '#111827',
};

const columnStyle: React.CSSProperties = {
  background: '#f9fafb',
  borderRadius: '12px',
  padding: '16px',
  minWidth: '260px',
  minHeight: '200px',
};

const TeamBoardPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      listWorkItems(teamId),
      getTeam(teamId),
    ])
      .then(([items, team]) => {
        setWorkItems(items.filter((w) => KANBAN_STATUSES.includes(w.status)));
        setTeamName(team?.name ?? '');
      })
      .catch(() => {
        setWorkItems([]);
        setTeamName('');
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const moveItem = async (itemId: string, newStatus: WorkItemStatus) => {
    try {
      await updateWorkItem(itemId, { status: newStatus });
      setWorkItems((prev) =>
        prev.map((w) => (w.id === itemId ? { ...w, status: newStatus } : w))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const byStatus = (status: WorkItemStatus) =>
    workItems.filter((w) => w.status === status);

  if (!teamId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>← Back</Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to={`/portal/leadership/teams/${teamId}`}
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to team
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>
          {teamName ? `${teamName} – Board` : 'Team board'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '20px' }}>
          Move cards between columns to update status.
        </p>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
            {COLUMNS.map((col) => (
              <div key={col.id} style={columnStyle}>
                <h3 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1rem' }}>
                  {col.label}
                </h3>
                {byStatus(col.id).map((item) => (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.title}</div>
                    {item.assigneeId && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Assigned</div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => c.id !== item.status).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => moveItem(item.id, c.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#e5e7eb',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#374151',
                          }}
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeamBoardPage;
