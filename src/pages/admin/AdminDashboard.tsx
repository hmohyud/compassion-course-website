import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUpcomingWebcasts } from '../../services/webcastService';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const webcasts = await getUpcomingWebcasts();
      setUpcomingCount(webcasts.filter(w => w.status === 'scheduled').length);
      setLiveCount(webcasts.filter(w => w.status === 'live').length);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login-4f73b2c');
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user-info">
          <span>Logged in as: {user?.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>
      <div className="admin-content">
        <p style={{ marginBottom: '30px' }}>Welcome to the Compassion Course admin dashboard.</p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <Link
            to="/admin/webcasts"
            style={{
              padding: '30px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              border: '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#002B4D';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h2 style={{ color: '#002B4D', marginBottom: '10px' }}>Webcast Management</h2>
            <p style={{ color: '#6b7280', marginBottom: '15px' }}>
              Schedule and manage webcasts with Google Meet integration
            </p>
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#6b7280' }}>
              <span><strong>{upcomingCount}</strong> Upcoming</span>
              <span><strong>{liveCount}</strong> Live</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
