import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getTeam } from '../../services/leadershipTeamsService';
import { getTeamBoardSettings, setTeamBoardSettings } from '../../services/teamBoardSettingsService';
import type { TeamBoardSettings, WorkItemLane, WorkItemStatus } from '../../types/leadership';

const LANE_OPTIONS: { id: WorkItemLane; label: string }[] = [
  { id: 'expedited', label: 'Expedite' },
  { id: 'fixed_date', label: 'Fixed Delivery Date' },
  { id: 'standard', label: 'Standard' },
  { id: 'intangible', label: 'Intangible' },
];

const DEFAULT_COLUMN_LABELS: Record<WorkItemStatus, string> = {
  backlog: 'Backlog',
  todo: 'Planned work',
  in_progress: 'In Progress',
  done: 'Done',
};

const COLUMN_KEYS: WorkItemStatus[] = ['backlog', 'todo', 'in_progress', 'done'];

const TeamBoardSettingsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [teamName, setTeamName] = useState('');
  const [settings, setSettings] = useState<TeamBoardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boardMode, setBoardMode] = useState<'scrum' | 'kanban'>('kanban');
  const [visibleLanes, setVisibleLanes] = useState<Set<WorkItemLane>>(new Set(LANE_OPTIONS.map((l) => l.id)));
  const [columnHeaders, setColumnHeaders] = useState<Partial<Record<WorkItemStatus, string>>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([getTeam(teamId), getTeamBoardSettings(teamId)])
      .then(([team, s]) => {
        setTeamName(team?.name ?? '');
        setSettings(s);
        setBoardMode(s.boardMode ?? 'kanban');
        setVisibleLanes(
          s.visibleLanes && s.visibleLanes.length > 0
            ? new Set(s.visibleLanes)
            : new Set(LANE_OPTIONS.map((l) => l.id))
        );
        setColumnHeaders(s.columnHeaders ?? {});
      })
      .catch(() => {
        setSettings(null);
        setVisibleLanes(new Set(LANE_OPTIONS.map((l) => l.id)));
        setColumnHeaders({});
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const toggleLane = (laneId: WorkItemLane) => {
    setVisibleLanes((prev) => {
      const next = new Set(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    setSaving(true);
    setSaved(false);
    try {
      await setTeamBoardSettings(teamId, {
        boardMode,
        visibleLanes: Array.from(visibleLanes),
        columnHeaders: Object.fromEntries(
          COLUMN_KEYS.map((k) => [k, (columnHeaders[k] ?? '').trim() || undefined]).filter(([, v]) => v != null)
        ) as Partial<Record<WorkItemStatus, string>>,
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!teamId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <p style={{ color: '#6b7280' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to={`/portal/leadership/teams/${teamId}/board`}
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to board
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.5rem' }}>Team Board Settings</h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '24px' }}>
          Configure this team&apos;s board display. Settings apply only to this team.
        </p>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.1rem' }}>Team Board</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
                Settings below apply only to {teamName || 'this team'}&apos;s board. Other teams are not affected.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Board mode:
                </label>
                <div style={{ display: 'flex', gap: '0' }}>
                  <button
                    type="button"
                    onClick={() => setBoardMode('scrum')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px 0 0 8px',
                      background: boardMode === 'scrum' ? '#002B4D' : '#fff',
                      color: boardMode === 'scrum' ? '#fff' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Scrum
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardMode('kanban')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0 8px 8px 0',
                      background: boardMode === 'kanban' ? '#002B4D' : '#fff',
                      color: boardMode === 'kanban' ? '#fff' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Kanban
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>
                  Only Kanban is supported at this time.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#374151' }}>
                  Show lanes on Kanban board
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {LANE_OPTIONS.map((lane) => (
                    <label key={lane.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleLanes.has(lane.id)}
                        onChange={() => toggleLane(lane.id)}
                      />
                      <span style={{ fontSize: '0.95rem' }}>{lane.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.1rem' }}>
                Column headers for {teamName || 'this team'}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
                Override column names for this team&apos;s board only. Leave blank to use the default.
              </p>
              {COLUMN_KEYS.map((key) => (
                <div key={key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#374151' }}>
                    {DEFAULT_COLUMN_LABELS[key]}:
                  </label>
                  <input
                    type="text"
                    value={columnHeaders[key] ?? ''}
                    onChange={(e) => setColumnHeaders((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Custom header for ${DEFAULT_COLUMN_LABELS[key]}`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '10px 20px', fontWeight: 600 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && (
                <span style={{ fontSize: '0.9rem', color: '#16a34a' }}>Settings saved.</span>
              )}
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default TeamBoardSettingsPage;
