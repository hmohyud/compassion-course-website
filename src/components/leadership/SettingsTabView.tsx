import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTeamBoardSettings, setTeamBoardSettings } from '../../services/teamBoardSettingsService';
import { deleteTeamWithData } from '../../services/leadershipTeamsService';
import { usePermissions } from '../../context/PermissionsContext';
import type { WorkItemLane, WorkItemStatus } from '../../types/leadership';

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

const HOLD_DURATION_MS = 2000;

interface SettingsTabViewProps {
  teamId: string;
  teamName: string;
  onSettingsSaved: () => void;
  onTeamDeleted?: () => void;
}

const SettingsTabView: React.FC<SettingsTabViewProps> = ({ teamId, teamName, onSettingsSaved, onTeamDeleted }) => {
  const { isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [visibleLanes, setVisibleLanes] = useState<Set<WorkItemLane>>(new Set(LANE_OPTIONS.map((l) => l.id)));
  const [columnHeaders, setColumnHeaders] = useState<Partial<Record<WorkItemStatus, string>>>({});

  // Delete team state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
    holdStartRef.current = 0;
  }, []);

  const handleDeleteHoldStart = useCallback(() => {
    if (deleting) return;
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(pct);
      if (pct >= 1) {
        clearHoldTimer();
        // Trigger delete
        setDeleting(true);
        setDeleteError('');
        deleteTeamWithData(teamId)
          .then(() => {
            onTeamDeleted?.();
          })
          .catch((err) => {
            console.error('Failed to delete team:', err);
            setDeleteError(err instanceof Error ? err.message : 'Failed to delete team.');
            setDeleting(false);
          });
      }
    }, 50);
  }, [teamId, deleting, clearHoldTimer, onTeamDeleted]);

  const handleDeleteHoldEnd = useCallback(() => {
    if (!deleting) clearHoldTimer();
  }, [deleting, clearHoldTimer]);

  // Cleanup on unmount
  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    getTeamBoardSettings(teamId)
      .then((s) => {
        setVisibleLanes(
          s.visibleLanes && s.visibleLanes.length > 0
            ? new Set(s.visibleLanes)
            : new Set(LANE_OPTIONS.map((l) => l.id))
        );
        setColumnHeaders(s.columnHeaders ?? {});
      })
      .catch(() => {
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
    setSaving(true);
    setSaved(false);
    try {
      await setTeamBoardSettings(teamId, {
        boardMode: 'kanban',
        visibleLanes: Array.from(visibleLanes),
        columnHeaders: Object.fromEntries(
          COLUMN_KEYS.map((k) => [k, (columnHeaders[k] ?? '').trim() || undefined]).filter(([, v]) => v != null)
        ) as Partial<Record<WorkItemStatus, string>>,
      });
      setSaved(true);
      onSettingsSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="ld-empty">Loading settings…</p>;

  return (
    <>
    <form onSubmit={handleSave}>
      <div className="ld-settings-card">
        <h2 className="ld-settings-title">Kanban Lanes</h2>
        <p className="ld-settings-desc">
          Choose which swim lanes to show on {teamName || 'this team'}'s board.
        </p>
        <label className="ld-settings-label">Show lanes on Kanban board</label>
        <div className="ld-settings-checkbox-group">
          {LANE_OPTIONS.map((lane) => (
            <label key={lane.id} className="ld-settings-checkbox-label">
              <input
                type="checkbox"
                checked={visibleLanes.has(lane.id)}
                onChange={() => toggleLane(lane.id)}
              />
              <span>{lane.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="ld-settings-card">
        <h2 className="ld-settings-title">Column headers for {teamName || 'this team'}</h2>
        <p className="ld-settings-desc">
          Override column names. Leave blank to use the default.
        </p>
        {COLUMN_KEYS.map((key) => (
          <div key={key} className="ld-settings-input-group">
            <label className="ld-settings-input-label">{DEFAULT_COLUMN_LABELS[key]}:</label>
            <input
              type="text"
              value={columnHeaders[key] ?? ''}
              onChange={(e) => setColumnHeaders((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={`Custom header for ${DEFAULT_COLUMN_LABELS[key]}`}
              className="ld-settings-input"
            />
          </div>
        ))}
      </div>

      <div className="ld-settings-actions">
        <button type="submit" className="ld-settings-save-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="ld-settings-saved">Settings saved.</span>}
      </div>
    </form>

    {/* Danger zone — admin only */}
    {isAdmin && (
      <div className="ld-settings-danger">
        <h2 className="ld-settings-danger-title">Danger Zone</h2>
        <p className="ld-settings-danger-desc">
          Permanently delete <strong>{teamName || 'this team'}</strong> and all its data including the board, all tasks, and settings. This cannot be undone.
        </p>
        {deleteError && <p className="ld-settings-danger-error">{deleteError}</p>}
        <div className="ld-settings-delete-wrap">
          <button
            type="button"
            className="ld-settings-delete-btn"
            disabled={deleting}
            onMouseDown={handleDeleteHoldStart}
            onMouseUp={handleDeleteHoldEnd}
            onMouseLeave={handleDeleteHoldEnd}
            onTouchStart={handleDeleteHoldStart}
            onTouchEnd={handleDeleteHoldEnd}
            onTouchCancel={handleDeleteHoldEnd}
          >
            {deleting ? (
              <span>Deleting…</span>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i>
                <span>Hold to delete team</span>
              </>
            )}
            {holdProgress > 0 && holdProgress < 1 && (
              <span
                className="ld-settings-delete-progress"
                style={{ width: `${holdProgress * 100}%` }}
              />
            )}
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default SettingsTabView;
