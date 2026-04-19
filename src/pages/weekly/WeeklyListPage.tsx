import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  listAllWeeklyContent,
  canViewWeek,
  type WeeklyContent,
} from '../../services/weeklyContentService';

// 2026 Member Portal — Lesson Library. Per the UX spec, members enter via
// the "2026 Member Portal" top-nav link, authenticate with email only
// (one-time), and can move between the Lesson Library here and the Global
// Compassion Network (Circle) community. Lessons release on a fixed
// schedule: Welcome Aboard on June 23, 2026 at 12:00 PM New York time,
// then Week 1 on June 24 and one more lesson every Wednesday at noon for
// the following 51 weeks.
//
// The email-only member auth (backed by the Jotform → Constant Contact
// member list uploaded on 6/24) is not wired up yet; until it lands, the
// library is admin-gated so content can be previewed and managed.

const WeeklyListPage: React.FC = () => {
  const { user, isAdmin, loading, adminLoading } = useAuth();
  const [weeks, setWeeks] = useState<WeeklyContent[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('loading');

  useEffect(() => {
    if (loading || adminLoading) return;
    if (!user || !isAdmin) return;
    let cancelled = false;
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
  }, [user, isAdmin, loading, adminLoading]);

  if (loading || adminLoading) {
    return <Layout><div style={{ padding: '6rem 1rem', textAlign: 'center' }}>Loading…</div></Layout>;
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return (
    <Layout>
      <section className="member-portal-page">
        <div className="container">
          <header className="member-portal-header">
            <span className="member-portal-eyebrow">2026 Member Portal</span>
            <h1>Lesson Library</h1>
            <p className="member-portal-lede">
              Welcome Aboard unlocks June 23, 2026 at 12:00 PM New York time.
              Week 1 follows on June 24, with one new lesson every Wednesday
              at noon for the 51 Wednesdays after that.
            </p>
            <div className="member-portal-actions">
              <Link to="/community" className="btn-primary">
                <i className="fas fa-users" aria-hidden="true" />
                &nbsp;Visit the Community (GCN)
              </Link>
              <Link to="/admin-portal/weekly" className="btn-secondary">
                Admin dashboard
              </Link>
            </div>
          </header>

          {fetchState === 'error' && (
            <div className="weekly-list-error">
              Failed to load weeks. Make sure you're signed in as an admin.
            </div>
          )}

          {fetchState === 'idle' && weeks.length === 0 && (
            <div className="weekly-list-empty">
              <p>No weekly content has been uploaded yet.</p>
              <Link to="/admin-portal/weekly" className="btn-primary">Go to admin dashboard</Link>
            </div>
          )}

          {weeks.length > 0 && (
            <div className="weekly-list-grid">
              {weeks.map((w) => {
                const access = canViewWeek({ content: w, isAdmin });
                const released = new Date(w.releaseDate) <= new Date();
                return (
                  <Link
                    key={w.weekNumber}
                    to={`/weekly/${w.weekNumber}`}
                    className={`weekly-list-card ${!released ? 'weekly-list-card--unreleased' : ''}`}
                  >
                    <div className="weekly-list-card-num">Week {w.weekNumber}</div>
                    <h3 className="weekly-list-card-title">{w.title || '(untitled)'}</h3>
                    <div className="weekly-list-card-meta">
                      <span>Releases: {w.releaseDate}</span>
                      {!w.published && <span className="weekly-list-card-badge">Unpublished</span>}
                      {!released && <span className="weekly-list-card-badge">Future</span>}
                      {!access.allowed && (
                        <span className="weekly-list-card-badge weekly-list-card-badge--lock">🔒 Admin only</span>
                      )}
                    </div>
                  </Link>
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
