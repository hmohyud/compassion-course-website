import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

// Admin page components (rendered as embedded views)
import UserManagement from '../../pages/admin/UserManagement';
import ContentManagement from '../../pages/admin/ContentManagement';
import WebcastManagement from '../../pages/admin/WebcastManagement';
import RolePermissionsPage from '../../pages/admin/RolePermissionsPage';

type AdminSubTab = 'users' | 'content' | 'webcasts' | 'roles';

const ADMIN_SUBTABS: { id: AdminSubTab; label: string; icon: string }[] = [
  { id: 'users', label: 'Users & Teams', icon: 'fas fa-users-cog' },
  { id: 'content', label: 'Content', icon: 'fas fa-edit' },
  { id: 'webcasts', label: 'Webcasts', icon: 'fas fa-video' },
  { id: 'roles', label: 'Roles & Permissions', icon: 'fas fa-shield-alt' },
];

const AdminTabView: React.FC = () => {
  const { isAdmin: isAdminUser } = useAuth();
  const { isAdmin } = usePermissions();
  const isAdminAny = isAdminUser || isAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const adminTabParam = searchParams.get('adminTab') as AdminSubTab | null;

  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(
    adminTabParam && ['users', 'content', 'webcasts', 'roles'].includes(adminTabParam)
      ? adminTabParam
      : 'users'
  );

  // Sync URL when sub-tab changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeSubTab !== 'users') {
      params.set('adminTab', activeSubTab);
    } else {
      params.delete('adminTab');
    }
    setSearchParams(params, { replace: true });
  }, [activeSubTab]);

  // Sync from URL changes (e.g. browser back/forward)
  useEffect(() => {
    if (adminTabParam && ['users', 'content', 'webcasts', 'roles'].includes(adminTabParam)) {
      setActiveSubTab(adminTabParam);
    }
  }, [adminTabParam]);

  if (!isAdminAny) {
    return (
      <div className="ld-admin-view">
        <p className="ld-empty">You do not have permission to access admin features.</p>
      </div>
    );
  }

  return (
    <div className="ld-admin-wrap">
      {/* Sub-tab bar */}
      <div className="ld-admin-subtab-bar">
        {ADMIN_SUBTABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ld-admin-subtab ${activeSubTab === tab.id ? 'ld-admin-subtab--active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="ld-admin-subtab-content">
        {activeSubTab === 'users' && <UserManagement />}
        {activeSubTab === 'content' && <ContentManagement />}
        {activeSubTab === 'webcasts' && <WebcastManagement />}
        {activeSubTab === 'roles' && <RolePermissionsPage />}
      </div>
    </div>
  );
};

export default AdminTabView;
