import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import WeeklyAdminView from '../../components/leadership/WeeklyAdminView';

// Standalone page wrapper around WeeklyAdminView.
// The same view is also embedded inside the Leadership Dashboard's
// Admin tab (?tab=adminPortal&adminTab=weekly) — both render identical
// markup; this page just provides the Layout chrome + auth gate for
// the bookmarkable /admin-portal/weekly URL.

const WeeklyAdminPage: React.FC = () => {
  const { user, isAdmin, loading, adminLoading } = useAuth();

  if (loading || adminLoading) {
    return <Layout><div style={{ padding: '6rem 1rem', textAlign: 'center' }}>Loading…</div></Layout>;
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return (
    <Layout>
      <section className="weekly-admin-page" style={{ padding: '3rem 0 5rem', minHeight: '70vh', background: '#fafafa' }}>
        <div className="container">
          <WeeklyAdminView />
        </div>
      </section>
    </Layout>
  );
};

export default WeeklyAdminPage;
