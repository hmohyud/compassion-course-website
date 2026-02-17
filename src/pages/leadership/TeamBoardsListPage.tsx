import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { listTeams } from '../../services/leadershipTeamsService';
import type { LeadershipTeam } from '../../types/leadership';

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

const TeamBoardsListPage: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    listTeams()
      .then((list) => {
        setTeams(list);
        console.log('[TeamBoardsListPage] teams loaded', { currentUserUid: user?.uid, teamCount: list.length });
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, searchQuery]);

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/leadership"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
          Team Boards
        </h1>

        <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '200px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>Team type:</label>
            <select
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : filteredTeams.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            {searchQuery.trim() ? 'No teams match your search.' : 'No teams yet.'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTeams.map((team) => (
              <li key={team.id}>
                <Link
                  to={`/portal/leadership/teams/${team.id}/board`}
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#002B4D';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ color: '#002B4D', fontWeight: 600, fontSize: '1rem' }}>{team.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default TeamBoardsListPage;
