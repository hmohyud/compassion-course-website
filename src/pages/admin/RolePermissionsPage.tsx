import React, { useState, useEffect } from 'react';
import {
  getRolePermissions,
  setRolePermissions,
  RolePermissionsConfig,
  PORTAL_ROLES,
} from '../../services/rolePermissionsService';
import { AVAILABLE_PERMISSIONS } from '../../types/permissions';
import type { PortalRole } from '../../types/platform';

const RolePermissionsPage: React.FC = () => {
  const [config, setConfig] = useState<RolePermissionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRolePermissions();
      setConfig(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load role permissions';
      setError(message);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (role: PortalRole, permissionId: string) => {
    if (!config) return;
    const list = [...config[role]];
    const idx = list.indexOf(permissionId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(permissionId);
    setConfig({ ...config, [role]: list });
  };

  const handleSave = async () => {
    if (!config) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await setRolePermissions(config);
      setSuccess('Role permissions saved.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ld-admin-view">
      <div className="ld-admin-view-content">
        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
          Platform admins have all rights. Configure which rights each portal role (Viewer, Contributor, Manager, Admin) has below.
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#16a34a',
              marginBottom: '20px',
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>Rights by role</h2>

          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : config ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: '#002B4D' }}>Right</th>
                      {PORTAL_ROLES.map((r) => (
                        <th key={r} style={{ padding: '12px 8px', color: '#002B4D', textTransform: 'capitalize' }}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <tr key={perm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {perm.label}
                            <span
                              title={perm.description}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#e5e7eb',
                                color: '#6b7280',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'help',
                                flexShrink: 0,
                              }}
                            >
                              ?
                            </span>
                          </span>
                        </td>
                        {PORTAL_ROLES.map((r) => (
                          <td key={r} style={{ padding: '12px 8px' }}>
                            <input
                              type="checkbox"
                              checked={config[r].includes(perm.id)}
                              onChange={() => toggle(r, perm.id)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={handleSave}
                  style={{
                    padding: '10px 20px',
                    background: saving ? '#9ca3af' : '#002B4D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#6b7280' }}>Unable to load configuration.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsPage;
