import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTeamBoardSettings, setTeamBoardSettings } from '../../services/teamBoardSettingsService';
import { deleteTeamWithData } from '../../services/leadershipTeamsService';
import { usePermissions } from '../../context/PermissionsContext';
import type { WorkItemStatus } from '../../types/leadership';

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
  const [columnHeaders, setColumnHeaders] = useState<Partial<Record<WorkItemStatus, string>>>({});
  const [showBacklogOnBoard, setShowBacklogOnBoard] = useState(false);

  // Track initial values so we can detect unsaved changes
  const [initialColumnHeaders, setInitialColumnHeaders] = useState<Partial<Record<WorkItemStatus, string>>>({});
  const [initialShowBacklogOnBoard, setInitialShowBacklogOnBoard] = useState(false);

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

  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    getTeamBoardSettings(teamId)
      .then((s) => {
        const headers = s.columnHeaders ?? {};
        const backlog = s.showBacklogOnBoard ?? false;
        setColumnHeaders(headers);
        setShowBacklogOnBoard(backlog);
        setInitialColumnHeaders(headers);
        setInitialShowBacklogOnBoard(backlog);
      })
      .catch(() => {
        setColumnHeaders({});
        setInitialColumnHeaders({});
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  // Detect unsaved changes
  const isDirty = useMemo(() => {
    if (showBacklogOnBoard !== initialShowBacklogOnBoard) return true;
    for (const key of COLUMN_KEYS) {
      if ((columnHeaders[key] ?? '') !== (initialColumnHeaders[key] ?? '')) return true;
    }
    return false;
  }, [columnHeaders, initialColumnHeaders, showBacklogOnBoard, initialShowBacklogOnBoard]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const headers = Object.fromEntries(
        COLUMN_KEYS.map((k) => [k, (columnHeaders[k] ?? '').trim() || undefined]).filter(([, v]) => v != null)
      ) as Partial<Record<WorkItemStatus, string>>;
      await setTeamBoardSettings(teamId, {
        boardMode: 'kanban',
        columnHeaders: headers,
        showBacklogOnBoard,
      });
      setSaved(true);
      // Update initial values so dirty state clears
      setInitialColumnHeaders(headers);
      setInitialShowBacklogOnBoard(showBacklogOnBoard);
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
        <h2 className="ld-settings-title">
          <i className="fas fa-pen" style={{ marginRight: 8, fontSize: '0.85rem', opacity: 0.5 }}></i>
          Column Names
        </h2>
        <p className="ld-settings-desc">
          Customize how columns are labeled on the board. Leave blank to use the defaults.
        </p>
        <div className="ld-settings-cols-grid">
          {COLUMN_KEYS.map((key) => (
            <div key={key} className="ld-settings-col-field">
              <span className="ld-settings-col-default">{DEFAULT_COLUMN_LABELS[key]}</span>
              <input
                type="text"
                value={columnHeaders[key] ?? ''}
                onChange={(e) => setColumnHeaders((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="Default"
                className="ld-settings-col-input"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="ld-settings-card">
        <h2 className="ld-settings-title">
          <i className="fas fa-columns" style={{ marginRight: 8, fontSize: '0.85rem', opacity: 0.5 }}></i>
          Board Layout
        </h2>
        <p className="ld-settings-desc">
          Configure how columns appear on the board.
        </p>
        <label className="ld-settings-toggle-label">
          <input
            type="checkbox"
            checked={showBacklogOnBoard}
            onChange={(e) => setShowBacklogOnBoard(e.target.checked)}
            className="ld-settings-toggle-checkbox"
          />
          <span className="ld-settings-toggle-text">
            Show backlog as a column on the board
          </span>
        </label>
        <p className="ld-settings-toggle-hint">
          When enabled, the backlog appears as a draggable column on the main board instead of only in the Backlog tab.
        </p>
      </div>

      <div className={`ld-settings-actions ${isDirty ? 'ld-settings-actions--dirty' : ''}`}>
        {isDirty && (
          <span className="ld-settings-unsaved">
            <i className="fas fa-exclamation-circle"></i> You have unsaved changes
          </span>
        )}
        <button type="submit" className={`ld-settings-save-btn ${isDirty ? 'ld-settings-save-btn--pulse' : ''}`} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && !isDirty && <span className="ld-settings-saved"><i className="fas fa-check"></i> Saved</span>}
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
