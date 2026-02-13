import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { usePermissions } from '../context/PermissionsContext';
import { listTeams } from '../services/leadershipTeamsService';
import type { LeadershipTeam } from '../types/leadership';

const cardStyle: React.CSSProperties = {
  padding: '20px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block',
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const LeadershipPortalPage: React.FC = () => {
  const { isAdmin } = usePermissions();
  const location = useLocation();
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const isDashboard = location.pathname === '/portal/leadership/dashboard';
  const isTeams = location.pathname === '/portal/leadership/teams';
  const isBacklog = location.pathname === '/portal/leadership/backlog';
  const isAdminPortal = location.pathname.startsWith('/admin');

  useEffect(() => {
    listTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Portal
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>Leadership Portal</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '24px' }}>
          Tools and resources for leaders.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <Link
            to="/portal/leadership/dashboard"
            style={{
              ...cardStyle,
              borderColor: isDashboard ? '#002B4D' : 'transparent',
              maxWidth: '280px',
            }}
            onMouseEnter={(e) => {
              if (!isDashboard) {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDashboard) {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>My Dashboard</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
              Messages, My Teams, and My Work widgets.
            </p>
          </Link>

          <Link
            to="/portal/leadership/backlog"
            style={{
              ...cardStyle,
              borderColor: isBacklog ? '#002B4D' : 'transparent',
              maxWidth: '280px',
            }}
            onMouseEnter={(e) => {
              if (!isBacklog) {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isBacklog) {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Main backlog</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
              Add tasks and assign them to teams.
            </p>
          </Link>

          <Link
            to="/portal/leadership/teams"
            style={{
              ...cardStyle,
              borderColor: isTeams ? '#002B4D' : 'transparent',
              maxWidth: '280px',
            }}
            onMouseEnter={(e) => {
              if (!isTeams) {
                e.currentTarget.style.borderColor = '#002B4D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isTeams) {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Teams</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
              Team Kanban board.
            </p>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                ...cardStyle,
                borderColor: isAdminPortal ? '#002B4D' : 'transparent',
                maxWidth: '280px',
              }}
              onMouseEnter={(e) => {
                if (!isAdminPortal) {
                  e.currentTarget.style.borderColor = '#002B4D';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAdminPortal) {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <h2 style={{ color: '#002B4D', marginBottom: '6px', fontSize: '1.1rem' }}>Admin portal</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                User management, create team, webcasts, content.
              </p>
            </Link>
          )}
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          <p style={{ color: '#6b7280', margin: 0 }}>
            Use the links above to open My Dashboard, Main backlog, Teams, or Admin portal (admins).
          </p>
        </div>

        {teams.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.1rem' }}>Teams</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '12px' }}>
              Open a team page for backlog, board, working agreements, and whiteboards.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {teams.map((t) => (
                <li key={t.id} style={{ marginBottom: '8px' }}>
                  <Link
                    to={`/portal/leadership/teams/${t.id}`}
                    style={{ color: '#002B4D', fontWeight: 500, textDecoration: 'none' }}
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeadershipPortalPage;
