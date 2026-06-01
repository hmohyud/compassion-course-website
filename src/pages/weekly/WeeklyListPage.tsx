import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  listAllWeeklyContent,
  type WeeklyContent,
} from '../../services/weeklyContentService';
import { getMember, type MemberRecord, normalizeEmail, isValidEmail } from '../../services/memberService';
import {
  getMemberSessionEmail,
  setMemberSessionEmail,
  clearMemberSession,
} from '../../services/memberSession';
import { useEmailLinkSignIn, consumeEmailLinkAttempt } from '../../hooks/useEmailLinkSignIn';

// 2026 Member Portal — Lesson Library.
//
// Three audiences:
//   - Admins: see everything immediately, no email gate.
//   - Members on the roster (Firestore `members` collection): enter their
//     email once → it's saved to localStorage → personalized greeting +
//     the lesson library on every subsequent visit.
//   - Everyone else: a friendly "Opening June 23, 2026" placeholder.
//
// Lesson schedule: Welcome Aboard on June 23, 2026 at 12:00 PM New York
// time; Week 1 on June 24; one lesson every Wednesday at noon for the 51
// weeks after that. Lesson content (HTML/audio) is still admin-gated at
// the viewer until the email-based content access lands; this page only
// handles the listing + greeting today.

const WeeklyListPage: React.FC = () => {
  const { isAdmin } = useAuth();

  // Synchronously process ?email=... sign-in links BEFORE the rest of the
  // component reads any session state. If a valid email was in the URL,
  // the session is already in localStorage by the time anything else runs.
  useEmailLinkSignIn();

  // ── Member email session ─────────────────────────────────────────────────
  const [member, setMember] = useState<MemberRecord | null>(null);
  // Initial state reflects whether a session is already present (set by
  // useEmailLinkSignIn above, or remembered from a previous visit). Starting
  // in 'checking' when a session exists avoids a flash of the email form
  // before the verify-useEffect resolves.
  const [memberCheckState, setMemberCheckState] = useState<'idle' | 'checking' | 'verified' | 'unknown'>(
    () => (typeof window !== 'undefined' && getMemberSessionEmail()) ? 'checking' : 'idle',
  );
  // If the URL-link's email gets rejected by the roster check, we capture
  // the attempted email here so the email-gate can show "we couldn't find
  // X, please re-enter" instead of the generic form.
  const [linkRejectedEmail, setLinkRejectedEmail] = useState<string | null>(null);

  // Email entry form state
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // ── Lesson library state ─────────────────────────────────────────────────
  const [weeks, setWeeks] = useState<WeeklyContent[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('idle');

  // On mount: if we already have a remembered email, look up the member
  // record and unlock the portal.
  useEffect(() => {
    if (isAdmin) {
      setMemberCheckState('verified');
      return;
    }
    const remembered = getMemberSessionEmail();
    if (!remembered) {
      setMemberCheckState('idle');
      return;
    }
    setMemberCheckState('checking');
    (async () => {
      try {
        const rec = await getMember(remembered);
        if (rec) {
          setMember(rec);
          setMemberCheckState('verified');
        } else {
          // Email no longer on roster (admin removed?); clear stale session.
          clearMemberSession();
          setMemberCheckState('idle');
          // If this email came from a URL link, surface a tailored error so
          // the user understands the link itself is what failed.
          const attemptedFromLink = consumeEmailLinkAttempt();
          if (attemptedFromLink) setLinkRejectedEmail(attemptedFromLink);
        }
      } catch (err) {
        console.error('Member lookup failed', err);
        // Fail open-ish: keep the session and show the email form again.
        clearMemberSession();
        setMemberCheckState('idle');
      }
    })();
  }, [isAdmin]);

  // Fetch lesson list whenever access is verified.
  const portalUnlocked = memberCheckState === 'verified';
  useEffect(() => {
    if (!portalUnlocked) return;
    let cancelled = false;
    setFetchState('loading');
    (async () => {
      try {
        const all = await listAllWeeklyContent();
        if (!cancelled) {
          setWeeks(all);
          setFetchState('idle');
        }
      } catch (err) {
        console.error('Failed to load weekly list', err);
        if (!cancelled) setFetchState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [portalUnlocked]);

  // ── Sign-in / sign-out handlers ──────────────────────────────────────────

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = normalizeEmail(emailInput);
    if (!isValidEmail(email)) {
      setSignInError("That doesn't look like a valid email — please double-check.");
      return;
    }
    setSubmitting(true);
    setSignInError(null);
    try {
      const rec = await getMember(email);
      if (!rec) {
        setSignInError(
          "We couldn't find that email on the 2026 cohort roster. " +
          'If you think this is a mistake, please contact us — sometimes ' +
          'a different email was used at registration.'
        );
        setMemberCheckState('unknown');
        return;
      }
      setMemberSessionEmail(email);
      setMember(rec);
      setMemberCheckState('verified');
    } catch (err: any) {
      console.error('Sign-in lookup failed', err);
      setSignInError('Something went wrong checking that email. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  function signOut() {
    clearMemberSession();
    setMember(null);
    setMemberCheckState('idle');
    setEmailInput('');
  }

  // (Per-user greeting removed — once we move to shared/generic sign-in
  // links there isn't a single user identity to greet by name.)

  // ── Renders ──────────────────────────────────────────────────────────────

  // 1a. Verifying an existing session (URL link or remembered email) —
  // show a quiet loading state instead of the email form so users coming
  // in via a sign-in link don't see a flash of the form before unlock.
  if (!isAdmin && memberCheckState === 'checking') {
    return (
      <Layout>
        <section className="member-portal-placeholder">
          <div className="container">
            <div className="member-portal-placeholder-inner" style={{ textAlign: 'center' }}>
              <span className="member-portal-eyebrow">2026 Member Portal</span>
              <h1>Signing you in…</h1>
              <p className="member-portal-lede">
                One moment while we check your access.
              </p>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // 1b. Email gate — non-admin and no verified session yet
  if (!isAdmin && memberCheckState !== 'verified') {
    return (
      <Layout>
        <section className="member-portal-placeholder">
          <div className="container">
            <div className="member-portal-placeholder-inner">
              <span className="member-portal-eyebrow">2026 Member Portal</span>
              <h1>Welcome</h1>
              <p className="member-portal-lede">
                Enter the email you registered with to access your Lesson Library.
                If you're a current Global Compassion Network member, you can also
                head straight to the GCN.
              </p>

              {linkRejectedEmail && (
                <p className="member-portal-error">
                  The link you used was for <strong>{linkRejectedEmail}</strong>,
                  but that email isn't on the 2026 cohort roster. If you
                  registered with a different email, please enter it below —
                  otherwise contact us at{' '}
                  <a href="mailto:coursecoordinator@nycnvc.org">
                    coursecoordinator@nycnvc.org
                  </a>.
                </p>
              )}

              <form onSubmit={onEmailSubmit} className="member-portal-emailform">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setSignInError(null); }}
                  placeholder="you@example.com"
                  disabled={submitting}
                  autoFocus
                  className="member-portal-emailinput"
                />
                <button
                  type="submit"
                  disabled={submitting || !emailInput.trim()}
                  className="btn-primary"
                >
                  {submitting ? 'Checking…' : 'Enter'}
                </button>
              </form>

              {signInError && (
                <p className="member-portal-error">{signInError}</p>
              )}

              <div className="member-portal-actions" style={{ marginTop: '2rem' }}>
                <Link to="/portal/community" className="btn-secondary">
                  <i className="fas fa-globe-americas" aria-hidden="true" />
                  &nbsp;Enter the GCN
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // 2. Verified (admin or member) — show greeting + library.
  // (greeting computed at the top of the component so the hook count
  // is stable across the email-gate vs verified renders.)
  return (
    <Layout>
      <section className="member-portal-page">
        <div className="container">
          <header className="member-portal-header">
            <span className="member-portal-eyebrow">2026 Member Portal</span>
            <h1>Lesson Library</h1>
            <p className="member-portal-lede">
              Each weekly lesson is released at 12:00 PM New York time. 
              Week one will be published at 12 noon on June 24 with one new lesson published every Wednesday at noon for the 51 Wednesdays after that.
            </p>
            <div className="member-portal-actions">
              <Link to="/portal/community" className="btn-primary">
                <i className="fas fa-globe-americas" aria-hidden="true" />
                &nbsp;Enter the GCN Circle Portal
              </Link>
              {isAdmin && (
                <>
                  <Link to="/portal/leadership?tab=adminPortal&adminTab=weekly" className="btn-secondary">
                    Manage lessons
                  </Link>
                  <Link to="/portal/leadership?tab=adminPortal&adminTab=members" className="btn-secondary">
                    Manage members
                  </Link>
                </>
              )}
              {!isAdmin && member && (
                <button
                  type="button"
                  onClick={signOut}
                  className="btn-secondary"
                  title={`Signed in as ${member.email}`}
                >
                  Sign out
                </button>
              )}
            </div>
          </header>

          {fetchState === 'loading' && (
            <div className="weekly-list-empty">
              <p>Loading lesson library…</p>
            </div>
          )}

          {fetchState === 'error' && (
            <div className="weekly-list-error">
              Failed to load lessons. Please refresh to try again.
            </div>
          )}

          {fetchState === 'idle' && weeks.length === 0 && (
            <div className="weekly-list-empty">
              <p>No lessons have been published yet. Check back after June 23, 2026.</p>
            </div>
          )}

          {weeks.length > 0 && (
            <div className="weekly-list-grid">
              {weeks.map((w) => {
                const released = new Date(w.releaseDate) <= new Date();
                // Admins can preview unreleased weeks; non-admins should
                // not be able to click into a "Coming soon" card.
                const clickable = isAdmin || released;
                const cls = `weekly-list-card ${!released ? 'weekly-list-card--unreleased' : ''}`;
                const inner = (
                  <>
                    <div className="weekly-list-card-num">Week {w.weekNumber}</div>
                    <h3 className="weekly-list-card-title">{w.title || '(untitled)'}</h3>
                    <div className="weekly-list-card-meta">
                      <span>Releases: {w.releaseDate}</span>
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
