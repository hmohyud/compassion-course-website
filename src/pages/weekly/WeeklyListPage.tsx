import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  listAllWeeklyContent,
  type WeeklyContent,
} from '../../services/weeklyContentService';

// 2026 Member Portal — Lesson Library. Open to everyone: anyone can see
// the list of lessons and their release dates. The actual lesson content
// (HTML + audio) is gated at the viewer (WeeklyViewerPage) so members
// only unlock a lesson once it has released and they're signed in as a
// member. Lesson schedule: Welcome Aboard on June 23, 2026 at 12:00 PM
// New York time; Week 1 on June 24; one lesson every Wednesday at noon
// for the 51 weeks after that.

const WeeklyListPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [weeks, setWeeks] = useState<WeeklyContent[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('loading');

  useEffect(() => {
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
  }, []);

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
              <Link to="/portal/community" className="btn-primary">
                <i className="fas fa-globe-americas" aria-hidden="true" />
                &nbsp;Enter the GCN Circle Portal
              </Link>
              {isAdmin && (
                <Link to="/admin-portal/weekly" className="btn-secondary">
                  Admin dashboard
                </Link>
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
                      {!released && <span className="weekly-list-card-badge">Coming soon</span>}
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
