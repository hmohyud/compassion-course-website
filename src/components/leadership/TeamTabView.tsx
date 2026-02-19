import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getWorkingAgreementsByTeam,
  updateWorkingAgreements,
} from '../../services/workingAgreementsService';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWorkingAgreementsByTeam(teamId)
      .then((ag) => {
        if (cancelled) return;
        setAgreementItems(ag?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setAgreementItems([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

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

        <div className="ld-team-overview-actions">
          <Link to="/whiteboards" className="ld-create-team-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <i className="fas fa-table-cells" aria-hidden />
            Whiteboards
          </Link>
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
    </>
  );
};

export default TeamTabView;
