import React, { useState, useEffect } from 'react';
import type { DashboardPrefs, WidgetId, MyTasksFilter } from './DashboardPrefs';
import { WIDGET_IDS, WIDGET_LABELS, getDashboardPrefs, setDashboardPrefs } from './DashboardPrefs';

interface DashboardSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (prefs: DashboardPrefs) => void;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [widgetIds, setWidgetIds] = useState<WidgetId[]>(() => getDashboardPrefs().widgetIds);
  const [myTasksFilter, setMyTasksFilter] = useState<MyTasksFilter>(() => getDashboardPrefs().myTasksFilter);

  useEffect(() => {
    if (open) {
      const prefs = getDashboardPrefs();
      setWidgetIds(prefs.widgetIds);
      setMyTasksFilter(prefs.myTasksFilter);
    }
  }, [open]);

  const enabledSet = new Set(widgetIds);

  const toggleWidget = (id: WidgetId) => {
    if (enabledSet.has(id)) {
      setWidgetIds((prev) => prev.filter((x) => x !== id));
    } else {
      setWidgetIds((prev) => [...prev, id]);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setWidgetIds((prev) => arrayMove(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    if (index >= widgetIds.length - 1) return;
    setWidgetIds((prev) => arrayMove(prev, index, index + 1));
  };

  const handleSave = () => {
    const prefs: DashboardPrefs = { widgetIds, myTasksFilter };
    setDashboardPrefs(prefs);
    onSave(prefs);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="ld-dashboard-settings-overlay" onClick={onClose}>
      <div
        className="ld-dashboard-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ld-dashboard-settings-header">
          <h3 className="ld-dashboard-settings-title">Dashboard Settings</h3>
          <button type="button" className="ld-dashboard-settings-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="ld-dashboard-settings-body">
          <fieldset className="ld-dashboard-settings-section">
            <legend>Widgets to show</legend>
            {WIDGET_IDS.map((id) => (
              <label key={id} className="ld-dashboard-settings-check">
                <input
                  type="checkbox"
                  checked={enabledSet.has(id)}
                  onChange={() => toggleWidget(id)}
                />
                <span>{WIDGET_LABELS[id]}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="ld-dashboard-settings-section">
            <legend>Widget order</legend>
            <p className="ld-dashboard-settings-hint">Order of widgets on your dashboard.</p>
            <ul className="ld-dashboard-settings-order-list">
              {widgetIds.map((id, index) => (
                <li key={id} className="ld-dashboard-settings-order-item">
                  <span>{WIDGET_LABELS[id]}</span>
                  <span className="ld-dashboard-settings-order-actions">
                    <button
                      type="button"
                      className="ld-btn-sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <i className="fas fa-chevron-up" />
                    </button>
                    <button
                      type="button"
                      className="ld-btn-sm"
                      onClick={() => moveDown(index)}
                      disabled={index === widgetIds.length - 1}
                      aria-label="Move down"
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="ld-dashboard-settings-section">
            <legend>My Tasks widget</legend>
            <p className="ld-dashboard-settings-hint">Which tasks to show in the My Tasks widget.</p>
            <label className="ld-dashboard-settings-radio">
              <input
                type="radio"
                name="myTasksFilter"
                checked={myTasksFilter === 'all'}
                onChange={() => setMyTasksFilter('all')}
              />
              <span>All tasks assigned to me</span>
            </label>
            <label className="ld-dashboard-settings-radio">
              <input
                type="radio"
                name="myTasksFilter"
                checked={myTasksFilter === 'in_progress'}
                onChange={() => setMyTasksFilter('in_progress')}
              />
              <span>Only in progress</span>
            </label>
          </fieldset>
        </div>

        <div className="ld-dashboard-settings-footer">
          <button type="button" className="ld-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ld-btn-sm ld-btn-sm--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettingsModal;
