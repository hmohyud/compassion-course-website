import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import Layout from '../../components/Layout';
import {
  listAllWeeklyContent,
  type WeeklyContent,
} from '../../services/weeklyContentService';
import {
  processWeeklyAccessLink,
  hasWeeklyAccess,
} from '../../services/weeklyAccess';
import { formatReleaseDate } from '../../utils/formatReleaseDate';

// 2026 Lesson Library.
//
// The course is delivered by email; the email link carries the access hash
// (…/weekly?hash=…). That single hash is the access password — there is no
// email roster anymore. Admins always have access via their normal login.

const WeeklyListPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { role } = usePermissions();
  // Internal staff (admins + leadership) can view the library without the email
  // hash — e.g. to audit the weekly messages and their practice links.
  const isStaff = isAdmin || role === 'manager' || role === 'admin';

  // Process a ?hash=… access link synchronously on first render (before we
  // read the access flag), so a fresh email link unlocks immediately.
  const [accessGranted] = useState(() => processWeeklyAccessLink());
  const unlocked = isStaff || accessGranted || hasWeeklyAccess();

  const [weeks, setWeeks] = useState<WeeklyContent[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    setFetchState('loading');
    (async () => {
      try {
        const all = await listAllWeeklyContent();
        if (!cancelled) { setWeeks(all); setFetchState('idle'); }
      } catch (err) {
        console.error('Failed to load weekly list', err);
        if (!cancelled) setFetchState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [unlocked]);

  // ── Locked: no access hash. Lessons are delivered by email. ──────────────
  if (!unlocked) {
    return (
      <Layout>
        <section className="member-portal-placeholder">
          <div className="container">
            <div className="member-portal-placeholder-inner" style={{ textAlign: 'center' }}>
              <span className="member-portal-eyebrow">The Compassion Course</span>
              <h1>Lesson Library</h1>
              <p className="member-portal-lede">
                Your weekly lessons are delivered by email. Please open the link
                in your course email to access the Lesson Library.
              </p>
              {/* Fallback shown ONLY when JavaScript is blocked — browsers hide
                  <noscript> when JS runs. This is the "library didn't load"
                  case: the app can't render without JS, so a normal (JS-rendered)
                  help section wouldn't appear either. */}
              <noscript
                dangerouslySetInnerHTML={{
                  __html: `
                  <div style="max-width:620px;margin:1.75rem auto 0;padding:1.25rem 1.5rem;background:#fdf6e3;border:1px solid #f0e2b6;border-radius:14px;text-align:left;color:#6b5618;line-height:1.55;">
                    <p style="font-weight:700;margin:0 0 .5rem;font-size:1.05rem;">Clicked your email link but your lessons didn't load?</p>
                    <p style="margin:0 0 .75rem;">This page needs <strong>JavaScript</strong> to open your lessons, and your browser (or a privacy / ad-blocker extension) is currently blocking it. Any one of these usually fixes it:</p>
                    <ul style="margin:0 0 .75rem;padding-left:1.25rem;">
                      <li>Turn <strong>JavaScript on</strong> in your browser settings.</li>
                      <li>Disable strict privacy tools for this site — e.g. <strong>Brave Shields</strong>, <strong>NoScript</strong>, ad/tracker blockers, or "Enhanced Tracking Protection".</li>
                      <li>Open the email link in a <strong>different browser</strong> (Chrome, Safari, Firefox, or Edge).</li>
                      <li>Try a <strong>different device</strong> (phone, tablet, or computer).</li>
                    </ul>
                    <p style="margin:0;">Still stuck? Email <a href="mailto:coursecoordinator@nycnvc.org" style="color:#8a6d1a;font-weight:600;">coursecoordinator@nycnvc.org</a> and we'll help you get in.</p>
                  </div>`,
                }}
              />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Unlocked: the lesson library. ────────────────────────────────────────
  return (
    <Layout>
      <section className="member-portal-page">
        <div className="container">
          <header className="member-portal-header">
            <span className="member-portal-eyebrow">The Compassion Course</span>
            <h1>Lesson Library</h1>
            <p className="member-portal-lede">
              Each weekly lesson is released at 12:00 PM ET, one new lesson every
              Wednesday at noon.
            </p>
            <div className="member-portal-actions">
              <Link to="/portal/community" className="btn-primary">
                <i className="fas fa-globe-americas" aria-hidden="true" />
                &nbsp;Enter the GCN Circle Portal
              </Link>
              {isAdmin && (
                <Link to="/portal/leadership?tab=adminPortal&adminTab=weekly" className="btn-secondary">
                  Manage lessons
                </Link>
              )}
            </div>
          </header>

          {fetchState === 'loading' && (
            <div className="weekly-list-empty"><p>Loading lesson library…</p></div>
          )}

          {fetchState === 'error' && (
            <div className="weekly-list-error">
              Failed to load lessons. Please refresh to try again.
            </div>
          )}

          {fetchState === 'idle' && weeks.length === 0 && (
            <div className="weekly-list-empty">
              <p>No lessons have been published yet.</p>
            </div>
          )}

          {weeks.length > 0 && (
            <div className="weekly-list-grid">
              {weeks.map((w) => {
                const released = new Date(w.releaseAt || w.releaseDate) <= new Date();
                const clickable = isAdmin || released;
                const cls = `weekly-list-card ${!released ? 'weekly-list-card--unreleased' : ''}`;
                const inner = (
                  <>
                    <div className="weekly-list-card-num">Week {w.weekNumber}</div>
                    <h3 className="weekly-list-card-title">{w.title || '(untitled)'}</h3>
                    <div className="weekly-list-card-meta">
                      <span>Releases: {formatReleaseDate(w.releaseDate)}</span>
                      {!released && <span className="weekly-list-card-badge">Coming soon</span>}
                    </div>
                  </>
                );
                return clickable ? (
                  <Link key={w.weekNumber} to={`/weekly/${w.weekNumber}`} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={w.weekNumber} className={cls} aria-disabled="true">
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default WeeklyListPage;
