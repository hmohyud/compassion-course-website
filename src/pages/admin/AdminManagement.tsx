import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

interface AdminRecord {
  id: string;
  email: string;
  role: string;
  grantedBy?: string;
  grantedAt?: string;
  status?: string;
}

const AdminManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const adminsRef = collection(db, 'admins');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Loading admins timed out after 10 seconds')), 10000)
      );
      
      const querySnapshot = await Promise.race([
        getDocs(adminsRef),
        timeoutPromise
      ]);
      
      const adminList: AdminRecord[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminRecord));
      
      setAdmins(adminList);
    } catch (error: any) {
      console.error('Error loading admins:', error);
      const isOfflineError = error?.code === 'unavailable' || 
                            error?.message?.includes('offline') ||
                            error?.message?.includes('network') ||
                            error?.message?.includes('timeout');
      
      if (isOfflineError) {
        setError('Unable to load admins. Please check your internet connection and try again.');
      } else if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
        setError('Permission denied. You may not have access to view admins.');
      } else {
        setError(error.message || 'Failed to load admins. Please try again.');
      }
      
      // Set empty array on error so UI doesn't stay in loading state
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const grantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existingAdmin = admins.find(a => a.email.toLowerCase() === normalizedEmail);
    if (existingAdmin) {
      setError('This email already has admin rights');
      return;
    }

    try {
      // Create admin document with email as ID for management
      // Note: The user will need to log in once for the system to create a UID-based document
      const adminRef = doc(db, 'admins', normalizedEmail);
      await setDoc(adminRef, {
        email: normalizedEmail,
        role: 'admin',
        grantedBy: user?.email || 'unknown',
        grantedAt: new Date().toISOString(),
        status: 'active',
        // Flag to indicate this is an email-based record
        lookupByEmail: true
      });

      setSuccess(`Admin rights granted to ${normalizedEmail}. They will have admin access when they log in.`);
      setEmail('');
      loadAdmins();
    } catch (error: any) {
      console.error('Error granting admin:', error);
      setError(error.message || 'Failed to grant admin rights. Please try again.');
    }
  };

  const revokeAdmin = async (adminId: string, adminEmail: string) => {
    if (!window.confirm(`Are you sure you want to revoke admin rights from ${adminEmail}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      // Delete the document by the provided ID (could be email or UID)
      await deleteDoc(doc(db, 'admins', adminId));
      
      // Also try to delete by email if the ID was a UID (to clean up email-based records)
      // and by UID if the ID was an email (to clean up UID-based records)
      const normalizedEmail = adminEmail.toLowerCase().trim();
      if (adminId !== normalizedEmail) {
        try {
          // Try deleting by email (in case adminId was a UID)
          await deleteDoc(doc(db, 'admins', normalizedEmail));
        } catch (emailDeleteError) {
          // Ignore if email-based document doesn't exist
        }
      }
      
      // Also try to find and delete any UID-based documents for this email
      // by querying all admins and finding matching emails
      try {
        const adminsRef = collection(db, 'admins');
        const querySnapshot = await getDocs(adminsRef);
        const matchingDocs = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.email && data.email.toLowerCase() === normalizedEmail && doc.id !== adminId;
        });
        
        // Delete any matching documents
        for (const matchingDoc of matchingDocs) {
          try {
            await deleteDoc(doc(db, 'admins', matchingDoc.id));
          } catch (deleteError) {
            console.warn('Could not delete matching admin document:', deleteError);
          }
        }
      } catch (queryError) {
        console.warn('Could not query for matching admin documents:', queryError);
      }
      
      setSuccess(`Admin rights revoked from ${adminEmail}`);
      loadAdmins();
    } catch (error: any) {
      console.error('Error revoking admin:', error);
      setError(error.message || 'Failed to revoke admin rights. Please try again.');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Management</h1>
        <div className="admin-user-info">
          <button onClick={() => navigate('/admin')} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>
      <div className="admin-content">
        {error && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#16a34a',
            marginBottom: '20px'
          }}>
            {success}
          </div>
        )}

        {/* Grant Admin Form */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>Grant Admin Rights</h2>
          <form onSubmit={grantAdmin}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 500,
                color: '#374151'
              }}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  maxWidth: '400px'
                }}
              />
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Enter the email address of the user you want to grant admin rights to. They can sign in using email/password or Google Sign-in with this email.
              </p>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                background: '#002B4D',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Grant Admin Rights
            </button>
          </form>
        </div>

        {/* Current Admins List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>Current Admins</h2>
          
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading admins...</p>
          ) : admins.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No admins found. Grant admin rights using the form above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid #e5e7eb',
                    textAlign: 'left'
                  }}>
                    <th style={{
                      padding: '12px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>Email</th>
                    <th style={{
                      padding: '12px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>Role</th>
                    <th style={{
                      padding: '12px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>Granted By</th>
                    <th style={{
                      padding: '12px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>Granted At</th>
                    <th style={{
                      padding: '12px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr
                      key={admin.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        color: '#111827'
                      }}>{admin.email}</td>
                      <td style={{
                        padding: '12px',
                        color: '#6b7280'
                      }}>{admin.role || 'admin'}</td>
                      <td style={{
                        padding: '12px',
                        color: '#6b7280'
                      }}>{admin.grantedBy || 'Unknown'}</td>
                      <td style={{
                        padding: '12px',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        {admin.grantedAt
                          ? new Date(admin.grantedAt).toLocaleString()
                          : 'Unknown'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => revokeAdmin(admin.id, admin.email)}
                          style={{
                            padding: '6px 12px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#dc2626';
                          }}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;
