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
                    <p style="margin:0 0 .75rem;">Don't worry — nothing is wrong with your account, and this is almost always a quick fix. Try these in order; the very first one works for most people.</p>
                    <ol style="margin:0 0 .75rem;padding-left:1.4rem;">
                      <li style="margin-bottom:.6rem;"><strong>Open it in your normal web browser.</strong> When you tap a link inside an email app (Gmail, Outlook, Apple Mail, Yahoo), it often opens in a small built-in window that can't show your lessons. Look for a <strong>three-dots menu (⋮)</strong> or a <strong>share icon</strong> in a corner of that window, then tap <strong>“Open in browser,” “Open in Safari,”</strong> or <strong>“Open in Chrome.”</strong> Your lessons should then load.</li>
                      <li style="margin-bottom:.6rem;"><strong>Try a different browser or device.</strong> If you can't find that menu, open your everyday browser yourself (Chrome, Safari, Firefox, or Edge), or try another device (phone, tablet, or computer) and use your email link from there.</li>
                      <li style="margin-bottom:.6rem;"><strong>Turn JavaScript on.</strong> Your lessons need a browser feature called JavaScript, which is occasionally switched off. This short guide finds your browser and shows you exactly where the setting is, with pictures: <a href="https://www.enable-javascript.com/" target="_blank" rel="noopener noreferrer" style="color:#8a6d1a;font-weight:600;">how to turn JavaScript on</a>.</li>
                      <li style="margin-bottom:0;"><strong>Using the Brave browser?</strong> Its built-in “Shields” can block the page. Here's how to turn Shields off for this site, with pictures: <a href="https://support.brave.com/hc/en-us/articles/360023646212-How-do-I-configure-global-and-site-specific-Shields-settings" target="_blank" rel="noopener noreferrer" style="color:#8a6d1a;font-weight:600;">Brave Shields guide</a>. (If you don't use Brave, skip this step.)</li>
                    </ol>
                    <p style="margin:0;">Still stuck? Email <a href="mailto:coursecoordinator@nycnvc.org" style="color:#8a6d1a;font-weight:600;">coursecoordinator@nycnvc.org</a> and a real person will help you get in.</p>
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
