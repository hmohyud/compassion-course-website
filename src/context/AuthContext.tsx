import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  getIdTokenResult,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserProfile, getUserProfile } from '../services/userProfileService';

// Temporary fallback admin emails (used when Firestore is offline)
const ADMIN_EMAILS: string[] = [
  'info@compassioncf.com'
];

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, recaptchaVerifier?: RecaptchaVerifier) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-create admin document for admin emails
  const createAdminDocument = async (user: User) => {
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return false;
    }

    try {
      console.log('🔧 Auto-creating admin document for:', user.email);
      await setDoc(doc(db, 'admins', user.uid), {
        role: 'admin',
        email: user.email,
        createdAt: new Date().toISOString(),
        autoCreated: true
      });
      console.log('✅ Admin document created successfully!');
      return true;
    } catch (error: any) {
      console.error('❌ Error creating admin document:', error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fast path for known admin emails - set admin immediately and set loading to false
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
          console.log('✅ Admin email detected, granting immediate access:', user.email);
          setIsAdmin(true);
          setLoading(false); // Set loading to false immediately for admin users
          
          // Do profile and admin document creation in background (non-blocking)
          Promise.all([
            // Ensure user profile exists
            getUserProfile(user.uid).then(existingProfile => {
              if (!existingProfile) {
                return createUserProfile(
                  user.uid,
                  user.email || '',
                  user.displayName || user.email?.split('@')[0] || 'User',
                  user.photoURL || undefined
                ).then(() => {
                  console.log('User profile created on login');
                });
              }
            }).catch(err => {
              const isOfflineError = err?.code === 'unavailable' || 
                                    err?.message?.includes('offline');
              if (!isOfflineError) {
                console.error('Error ensuring user profile exists:', err);
              }
            }),
            // Create admin document
            createAdminDocument(user).catch(err => {
              console.warn('⚠️ Background admin document creation failed (non-blocking):', err);
            })
          ]).catch(() => {
            // Ignore background errors
          });
          
          return; // Exit early for admin users
        }

        // For non-admin users, check admin status first (with timeout)
        const checkAdmin = async () => {
          try {
            const tokenResult = await Promise.race([
              getIdTokenResult(user, true),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Token check timeout')), 3000)
              )
            ]);
            
            const hasAdminClaim = tokenResult.claims?.admin === true;
            
            if (hasAdminClaim) {
              console.log('✅ ADMIN ACCESS CONFIRMED via custom claim!');
              setIsAdmin(true);
              return;
            }
          } catch (claimError: any) {
            if (!claimError?.message?.includes('timeout')) {
              console.warn('⚠️ Error checking custom claims:', claimError);
            }
          }
          
          // Check Firestore document (single attempt with timeout)
          try {
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Admin check timeout')), 3000)
            );
            
            // First, try checking by UID
            let adminDoc = await Promise.race([
              getDoc(doc(db, 'admins', user.uid)),
              timeoutPromise
            ]);
            
            let exists = adminDoc.exists();
            let role = adminDoc.data()?.role;
            let isAdminUser = exists && role === 'admin';
            
            // If not found by UID, try checking by email
            if (!isAdminUser && user.email) {
              try {
                const emailDoc = await Promise.race([
                  getDoc(doc(db, 'admins', user.email.toLowerCase().trim())),
                  timeoutPromise
                ]);
                
                if (emailDoc.exists() && emailDoc.data()?.role === 'admin') {
                  console.log('✅ Admin found by email, syncing to UID-based document');
                  // Found by email - create/update UID-based document for future lookups
                  try {
                    await setDoc(doc(db, 'admins', user.uid), {
                      email: user.email,
                      role: 'admin',
                      grantedBy: emailDoc.data()?.grantedBy || 'system',
                      grantedAt: emailDoc.data()?.grantedAt || new Date().toISOString(),
                      status: 'active'
                    });
                    console.log('✅ Admin document synced to UID');
                  } catch (syncError) {
                    console.warn('⚠️ Could not sync admin document to UID:', syncError);
                  }
                  isAdminUser = true;
                  role = 'admin';
                }
              } catch (emailCheckError: any) {
                // If email check fails, continue with UID check result
                console.warn('⚠️ Error checking admin by email:', emailCheckError);
              }
            }
            
            setIsAdmin(isAdminUser);
          } catch (error: any) {
            const isOfflineError = error?.code === 'unavailable' || 
                                  error?.message?.includes('offline') ||
                                  error?.message?.includes('timeout');
            
            if (!isOfflineError) {
              console.error('❌ Error checking admin status:', error);
            }
            setIsAdmin(false);
          }
        };
        
        try {
          await checkAdmin();
        } catch (adminError) {
          console.error('Error in checkAdmin:', adminError);
          setIsAdmin(false);
        }
        
        // Ensure user profile exists in background (non-blocking)
        getUserProfile(user.uid).then(existingProfile => {
          if (!existingProfile) {
            return createUserProfile(
              user.uid,
              user.email || '',
              user.displayName || user.email?.split('@')[0] || 'User',
              user.photoURL || undefined
            ).then(() => {
              console.log('User profile created on login');
            });
          }
        }).catch(err => {
          const isOfflineError = err?.code === 'unavailable' || 
                                err?.message?.includes('offline');
          if (!isOfflineError) {
            console.error('Error ensuring user profile exists:', err);
          }
        });
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCredential.user.email);
      
      // Auto-create admin document if email is in admin list
      if (ADMIN_EMAILS.includes(email)) {
        console.log('🔄 Admin email detected, ensuring admin document exists...');
        await createAdminDocument(userCredential.user);
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Firebase login error:', error);
      // Re-throw the error so the LoginPage can handle it
      throw error;
    }
  };

  const register = async (email: string, password: string, recaptchaVerifier?: RecaptchaVerifier) => {
    try {
      // Note: createUserWithEmailAndPassword doesn't directly accept recaptchaVerifier,
      // but Firebase will use it automatically if initialized. For explicit v2 usage,
      // we ensure the verifier is set up before calling createUserWithEmailAndPassword.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Registration successful:', userCredential.user.email);
      
      // Auto-create user profile
      try {
        const existingProfile = await getUserProfile(userCredential.user.uid);
        if (!existingProfile) {
          await createUserProfile(
            userCredential.user.uid,
            email,
            userCredential.user.displayName || email.split('@')[0],
            userCredential.user.photoURL || undefined  // Convert null to undefined
          );
          console.log('User profile created successfully');
        }
      } catch (profileError) {
        console.error('Error creating user profile:', profileError);
        // Don't fail registration if profile creation fails
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Firebase registration error:', error);
      // Re-throw the error so the RegisterPage can handle it
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', userCredential.user.email);
      
      // Auto-create user profile
      try {
        const existingProfile = await getUserProfile(userCredential.user.uid);
        if (!existingProfile) {
          await createUserProfile(
            userCredential.user.uid,
            userCredential.user.email || '',
            userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
            userCredential.user.photoURL || undefined  // Convert null to undefined
          );
          console.log('User profile created from Google sign-in');
        }
      } catch (profileError) {
        console.error('Error creating user profile:', profileError);
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    isAdmin,
    loading,
    login,
    register,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
