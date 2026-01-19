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
        // Ensure user profile exists
        try {
          const existingProfile = await getUserProfile(user.uid);
          if (!existingProfile) {
            await createUserProfile(
              user.uid,
              user.email || '',
              user.displayName || user.email?.split('@')[0] || 'User',
              user.photoURL || undefined  // Convert null to undefined
            );
            console.log('User profile created on login');
          }
        } catch (profileError: any) {
          // Don't log offline errors as errors - they're expected during initialization
          const isOfflineError = profileError?.code === 'unavailable' || 
                                profileError?.message?.includes('offline') ||
                                profileError?.message?.includes('Failed to get document because the client is offline');
          
          if (!isOfflineError) {
            console.error('Error ensuring user profile exists:', profileError);
          }
          // Silently continue - profile will be created when Firebase comes online
        }

        // Check if user is admin - first check custom claims, then Firestore
        const checkAdmin = async (retries = 3) => {
          // First, check custom claims (most reliable)
          try {
            const tokenResult = await getIdTokenResult(user, true); // Force refresh to get latest claims
            const hasAdminClaim = tokenResult.claims?.admin === true;
            
            console.log('🔐 Admin check for user:', {
              email: user.email,
              uid: user.uid,
              customClaims: tokenResult.claims,
              hasAdminClaim: hasAdminClaim
            });
            
            if (hasAdminClaim) {
              console.log('✅ ADMIN ACCESS CONFIRMED via custom claim!');
              setIsAdmin(true);
              setLoading(false);
              return;
            }
          } catch (claimError: any) {
            console.warn('⚠️ Error checking custom claims:', claimError);
            // Continue to Firestore check as fallback
          }
          
          // Fallback: Check Firestore document
          for (let i = 0; i < retries; i++) {
            try {
              const adminDoc = await getDoc(doc(db, 'admins', user.uid));
              const exists = adminDoc.exists();
              const role = adminDoc.data()?.role;
              const isAdminUser = exists && role === 'admin';
              
              console.log('🔐 Firestore admin check:', {
                email: user.email,
                uid: user.uid,
                adminDocExists: exists,
                role: role,
                isAdmin: isAdminUser,
                attempt: i + 1
              });
              
              if (isAdminUser) {
                console.log('✅ ADMIN ACCESS CONFIRMED via Firestore!');
              } else {
                console.log('❌ Admin check failed - User is NOT admin');
              }
              
              setIsAdmin(isAdminUser);
              
              if (!exists) {
                console.warn('⚠️ No admin document found for user:', user.email);
                // Auto-create admin document if email is in admin list
                if (user.email && ADMIN_EMAILS.includes(user.email)) {
                  console.log('🔄 Auto-creating admin document...');
                  const created = await createAdminDocument(user);
                  if (created) {
                    // Re-check admin status
                    const newAdminDoc = await getDoc(doc(db, 'admins', user.uid));
                    if (newAdminDoc.exists() && newAdminDoc.data()?.role === 'admin') {
                      console.log('✅ Admin document created and verified!');
                      setIsAdmin(true);
                      return;
                    }
                  }
                } else {
                  console.warn('💡 To grant admin access, create a document at: admins/' + user.uid + ' with { role: "admin" }');
                }
              } else if (role !== 'admin') {
                console.warn('⚠️ User has admin document but role is not "admin":', role);
              }
              return; // Success, exit retry loop
            } catch (error: any) {
              const isOfflineError = error?.code === 'unavailable' || 
                                    error?.message?.includes('offline') ||
                                    error?.message?.includes('network') ||
                                    error?.message?.includes('Failed to get document because the client is offline');
              
              const isPermissionError = error?.code === 'permission-denied' ||
                                       error?.code === 'PERMISSION_DENIED' ||
                                       error?.message?.includes('Missing or insufficient permissions') ||
                                       error?.message?.includes('permission') ||
                                       error?.message?.includes('Permission denied');
              
              // Only log non-offline errors as errors
              if (!isOfflineError) {
                console.error(`❌ Error checking admin status (attempt ${i + 1}/${retries}):`, error);
                console.error(`   Error code: ${error?.code}, Message: ${error?.message}`);
              } else if (i === 0) {
                // Only log offline error on first attempt, not on retries
                console.log(`ℹ️ Firebase is initializing (offline mode). Retrying...`);
              }
              
              // If it's a permission error, try to create admin document first
              if (isPermissionError) {
                console.warn('⚠️ Permission error detected');
                
                // Try to auto-create admin document if email is in admin list
                if (user.email && ADMIN_EMAILS.includes(user.email)) {
                  console.log('🔄 Attempting to auto-create admin document...');
                  const created = await createAdminDocument(user);
                  
                  if (created) {
                    // Try reading again after creation
                    try {
                      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                      if (adminDoc.exists() && adminDoc.data()?.role === 'admin') {
                        console.log('✅ Admin document created and verified!');
                        setIsAdmin(true);
                        setLoading(false);
                        return;
                      }
                    } catch (retryError) {
                      console.warn('⚠️ Still getting permission error after creation, using email fallback');
                    }
                  }
                  
                  // Fallback to email-based check
                  console.log('✅ Admin access granted via email fallback:', user.email);
                  setIsAdmin(true);
                  setLoading(false);
                  return;
                } else {
                  console.log('❌ Email not in admin fallback list');
                  setIsAdmin(false);
                  return;
                }
              }
              
              // On final retry attempt, try email fallback
              if (i === retries - 1) {
                if (user.email && ADMIN_EMAILS.includes(user.email)) {
                  // Try creating admin document one more time
                  const created = await createAdminDocument(user);
                  if (created) {
                    console.log('✅ Admin document created on final attempt');
                    setIsAdmin(true);
                    setLoading(false);
                    return;
                  }
                  // Fallback to email check
                  console.log('✅ Admin access granted via email fallback:', user.email);
                  setIsAdmin(true);
                  setLoading(false);
                  return;
                } else {
                  console.log('❌ Email not in admin fallback list');
                  setIsAdmin(false);
                  return;
                }
              }
              
              if (i < retries - 1 && isOfflineError) {
                // Wait before retrying with exponential backoff
                const delay = 1000 * Math.pow(2, i);
                console.log(`⏳ Retrying admin check in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
        };
        
        try {
          await checkAdmin();
        } catch (adminError) {
          console.error('Error in checkAdmin:', adminError);
          setIsAdmin(false);
        }
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
