import React, { useState, useEffect } from 'react';
import { createTeamWithBoard } from '../../services/leadershipTeamsService';
import { listUserProfiles } from '../../services/userProfileService';
import type { UserProfile } from '../../types/platform';

interface CreateTeamModalProps {
  onCreated: (teamId: string) => void;
  onClose: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onCreated, onClose }) => {
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUserProfiles()
      .then((list) => { if (!cancelled) setProfiles(list); })
      .catch(() => { if (!cancelled) setProfiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Team name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const team = await createTeamWithBoard(trimmed, Array.from(selectedIds));
      onCreated(team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team.');
      setSubmitting(false);
    }
  };

  return (
    <div className="ld-modal-overlay" onClick={onClose}>
      <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ld-modal-title">Create team</h2>
        <p className="ld-modal-desc">
          Create a new team and its board. You can add members now or later.
        </p>

        <form onSubmit={handleSubmit} className="ld-modal-form">
          <div>
            <label htmlFor="ct-name" className="ld-modal-label">Team name</label>
            <input
              id="ct-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Team"
              className="ld-modal-input"
            />
          </div>

          <div>
            <label className="ld-modal-label">Members (optional)</label>
            {loading ? (
              <p className="ld-empty">Loading users…</p>
            ) : profiles.length === 0 ? (
              <p className="ld-empty">No user profiles found.</p>
            ) : (
              <div className="ld-modal-member-list">
                {profiles.map((p) => (
                  <label key={p.id} className="ld-modal-member-label">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleMember(p.id)}
                    />
                    <span className="ld-modal-member-name">{p.name || p.email || p.id}</span>
                    {p.email && (
                      <span className="ld-modal-member-email">({p.email})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="ld-modal-error">{error}</p>}

          <div className="ld-modal-actions">
            <button type="submit" disabled={submitting} className="ld-modal-submit-btn">
              {submitting ? 'Creating…' : 'Create team'}
            </button>
            <button type="button" className="ld-modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;
