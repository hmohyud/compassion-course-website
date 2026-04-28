import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listMembers,
  saveMember,
  deleteMember,
  bulkAddMembers,
  parseBulkInput,
  isValidEmail,
  normalizeEmail,
  type MemberRecord,
} from '../../services/memberService';

// Embeddable member-roster admin view. Same workflows as the standalone
// page (single add/edit, bulk import, edit, delete, search) but without
// Layout/route guards — it's rendered inside the LeadershipDashboardPage's
// Admin tab. The parent gates on isAdmin already, and Firestore rules are
// the real wall.

const blank: MemberRecord = { email: '' };

const MembersAdminView: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<MemberRecord[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('loading');
  const [filter, setFilter] = useState('');

  const [draft, setDraft] = useState<MemberRecord>(blank);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = async () => {
    setFetchState('loading');
    try {
      const list = await listMembers();
      setRows(list);
      setFetchState('idle');
    } catch (err) {
      console.error('Failed to load members', err);
      setFetchState('error');
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.email, r.name, r.city, r.state, r.country, r.tier]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [rows, filter]);

  // Map full-list email → 1-based position. Stays stable when filtering
  // so #5 always means "5th member overall", not "5th in the filtered view".
  const numberByEmail = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.email, i + 1));
    return m;
  }, [rows]);

  function startEdit(r: MemberRecord) {
    setDraft({ ...r });
    setEditingEmail(r.email);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function resetForm() {
    setDraft(blank);
    setEditingEmail(null);
    setMsg(null);
  }

  async function onSave() {
    const email = normalizeEmail(draft.email);
    if (!isValidEmail(email)) {
      setMsg({ kind: 'err', text: 'A valid email is required.' });
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      await saveMember({ ...draft, email }, user.uid);
      setMsg({ kind: 'ok', text: editingEmail ? `Updated ${email}` : `Added ${email}` });
      resetForm();
      await refresh();
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Save failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(email: string) {
    if (!window.confirm(`Remove ${email} from the member list?`)) return;
    setBusy(true);
    try {
      await deleteMember(email);
      setMsg({ kind: 'ok', text: `Removed ${email}` });
      if (editingEmail === email) resetForm();
      await refresh();
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Delete failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function onBulkImport() {
    const records = parseBulkInput(bulkText);
    if (records.length === 0) {
      setMsg({ kind: 'err', text: 'No valid emails detected in the input.' });
      return;
    }
    if (!user) return;
    setBulkBusy(true);
    try {
      const result = await bulkAddMembers(records, user.uid);
      const skipNote = result.skipped > 0
        ? ` (${result.skipped} skipped: ${result.invalidEmails.slice(0, 3).join(', ')}${result.invalidEmails.length > 3 ? '…' : ''})`
        : '';
      setMsg({ kind: 'ok', text: `Imported ${result.added} member(s)${skipNote}` });
      setBulkText('');
      await refresh();
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Bulk import failed.' });
    } finally {
      setBulkBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.7rem',
    border: '1px solid #d4d4d8',
    borderRadius: 6,
    fontSize: '0.9rem',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#52525b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div className="ld-members-view" style={{ maxWidth: 1100 }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#0d9488', marginBottom: '0.25rem' }}>
          2026 Cohort Members
        </h2>
        <p style={{ color: '#52525b', fontSize: '0.9rem', margin: 0 }}>
          <strong>{rows.length}</strong> member{rows.length === 1 ? '' : 's'} in the roster.
          {' '}This list gates the 2026 Member Portal once the email-only sign-in is wired up.
        </p>
      </header>

      {msg && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.7rem 1rem',
          background: msg.kind === 'ok' ? '#ecfdf5' : '#fef2f2',
          color: msg.kind === 'ok' ? '#065f46' : '#991b1b',
          border: `1px solid ${msg.kind === 'ok' ? '#a7f3d0' : '#fecaca'}`,
          borderRadius: 6,
          fontSize: '0.9rem',
        }}>{msg.text}</div>
      )}

      {/* Single add / edit form */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.85rem' }}>
          {editingEmail ? `Edit ${editingEmail}` : 'Add a member'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.7rem' }}>
          <div>
            <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="email" required style={inputStyle}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              disabled={!!editingEmail}
              placeholder="member@example.com"
            />
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={draft.city || ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={draft.state || ''} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <input style={inputStyle} value={draft.country || ''} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Amount (USD)</label>
            <input
              type="number" style={inputStyle}
              value={draft.amount ?? ''}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
        <div style={{ marginTop: '0.7rem' }}>
          <label style={labelStyle}>Tier / Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
            value={draft.tier || ''}
            onChange={(e) => setDraft({ ...draft, tier: e.target.value })}
            placeholder="e.g. Regular tuition – $240"
          />
        </div>
        <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button" onClick={onSave}
            disabled={busy || !draft.email}
            style={{
              padding: '0.5rem 1rem', background: '#0d9488', color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
              opacity: busy || !draft.email ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : editingEmail ? 'Update member' : 'Add member'}
          </button>
          {editingEmail && (
            <button
              type="button" onClick={resetForm}
              style={{ padding: '0.5rem 1rem', background: '#fff', color: '#52525b', border: '1px solid #d4d4d8', borderRadius: 6, cursor: 'pointer' }}
            >Cancel</button>
          )}
        </div>
      </div>

      {/* Bulk add */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Bulk add</h3>
        <p style={{ color: '#71717a', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
          Paste one email per line, or a CSV with a header row like:
          {' '}<code style={{ background: '#f4f4f5', padding: '1px 5px', borderRadius: 3 }}>email,name,city,state,country,tier,amount</code>.
          Existing members with the same email are updated; invalid emails are skipped.
        </p>
        <textarea
          style={{ ...inputStyle, minHeight: 130, fontFamily: 'monospace' }}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="alice@example.com&#10;bob@example.com&#10;…"
        />
        <button
          type="button" onClick={onBulkImport}
          disabled={bulkBusy || !bulkText.trim()}
          style={{
            marginTop: '0.7rem', padding: '0.5rem 1rem',
            background: '#0d9488', color: '#fff', border: 'none',
            borderRadius: 6, fontWeight: 600, cursor: 'pointer',
            opacity: bulkBusy || !bulkText.trim() ? 0.6 : 1,
          }}
        >{bulkBusy ? 'Importing…' : 'Import emails'}</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>
            Members <span style={{ color: '#71717a', fontWeight: 400 }}>({filtered.length}{filter ? ` of ${rows.length}` : ''})</span>
          </h3>
          <input
            type="search" placeholder="Search by email, name, city…"
            value={filter} onChange={(e) => setFilter(e.target.value)}
            style={{ ...inputStyle, maxWidth: 320 }}
          />
        </div>

        {fetchState === 'loading' && <p style={{ color: '#71717a' }}>Loading…</p>}
        {fetchState === 'error' && <p style={{ color: '#991b1b' }}>Failed to load members.</p>}
        {fetchState === 'idle' && filtered.length === 0 && (
          <p style={{ color: '#71717a' }}>{rows.length === 0 ? 'No members yet.' : 'No members match your search.'}</p>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e4e4e7', color: '#52525b' }}>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600, width: '3rem', textAlign: 'right' }}>#</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Tier</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.email} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                      {numberByEmail.get(r.email)}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace' }}>{r.email}</td>
                    <td style={{ padding: '0.5rem 0.6rem' }}>{r.name || ''}</td>
                    <td style={{ padding: '0.5rem 0.6rem', color: '#52525b' }}>
                      {[r.city, r.state, r.country].filter(Boolean).join(', ')}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', color: '#52525b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.tier || ''}>
                      {r.tier || ''}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem' }}>{typeof r.amount === 'number' ? `$${r.amount}` : ''}</td>
                    <td style={{ padding: '0.5rem 0.6rem', color: '#71717a', fontSize: '0.8rem' }}>{r.source || ''}</td>
                    <td style={{ padding: '0.5rem 0.6rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button onClick={() => startEdit(r)} style={{ marginRight: 6, padding: '0.3rem 0.7rem', border: '1px solid #d4d4d8', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => onDelete(r.email)} style={{ padding: '0.3rem 0.7rem', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersAdminView;
