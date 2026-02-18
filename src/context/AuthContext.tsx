import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getIdTokenResult,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  RecaptchaVerifier,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserProfile, getUserProfile } from '../services/userProfileService';
import {
  getUserDoc,
  ensureUserDoc,
  type UserDoc,
  type UserStatus,
  type UserRole,
} from '../services/usersService';
import {
  logAuthDiagnostics,
  isDomainBlockingError,
  getDomainBlockingErrorMessage,
} from '../utils/authDiagnostics';

// Temporary fallback admin emails (used when Firestore is offline)
const ADMIN_EMAILS: string[] = ['info@compassioncf.com', 'jaybond@compassioncf.com'];

/** True if the user has email/password as a sign-in method (so they can log in with password). */
export function hasPasswordProvider(user: User | null): boolean {
  return !!user?.providerData?.some((p) => p.providerId === 'password');
}

/** True if the user has Google linked (google.com in providerData). */
export function hasGoogleProvider(user: User | null): boolean {
  return !!user?.providerData?.some((p) => p.providerId === 'google.com');
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  /** True until admin check completes for the current user (only relevant when user is set). */
  adminLoading: boolean;
  /** Canonical user doc (users/{uid}); null while loading or if not yet created. */
  userDoc: UserDoc | null;
  /** True while the users/{uid} doc is being loaded/retried. */
  userDocLoading: boolean;
  userRole: UserRole | null;
  userStatus: UserStatus | null;
  isActive: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, recaptchaVerifier?: RecaptchaVerifier) => Promise<void>;
  /** Sign in (or up) with Google popup. Reuses existing accounts with the same email. */
  signInWithGoogle: () => Promise<void>;
  /** Link Google to the current user (must be logged in). Use on profile/settings only. */
  linkGoogleAccount: () => Promise<void>;
  linkEmailPassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  const [adminLoading, setAdminLoading] = useState(false);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [userDocLoading, setUserDocLoading] = useState(false);

  // ✅ Auth listener (guarded when Firebase is disabled)
  useEffect(() => {
    // When Firebase env vars are missing, firebaseConfig exports auth/db as null.
    // We want the UI to keep rendering (UI-only mode), not crash.
    if (!auth) {
      setUser(null);
      setIsAdmin(false);
      setUserDoc(null);
      setAdminLoading(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);

      if (fbUser?.uid) {
        setAdminLoading(true);

        // Read-only admin check: claims first, then admins/{uid} doc (if db available).
        const checkAdmin = async () => {
          // 1) Custom claim check (works without Firestore)
          try {
            const tokenResult = await Promise.race([
              getIdTokenResult(fbUser, true),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Token check timeout')), 3000)
              ),
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

          // 2) Firestore check (only if db is available)
          if (!db) {
            setIsAdmin(false);
            return;
          }

          const docPath = `admins/${fbUser.uid}`;
          console.log('[admin check] start uid=', fbUser.uid);
          console.log('[admin check] doc path', docPath);

          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Admin check timeout')), 3000)
            );
            const adminDoc = await Promise.race([getDoc(doc(db, 'admins', fbUser.uid)), timeoutPromise]);

            console.log('[admin check] snap.exists()', adminDoc.exists());
            const data = adminDoc.data();
            if (adminDoc.exists()) {
              console.log('[admin check] snap.data()', data);
            }

            const status = data?.status;
            const role = data?.role;
            const okStatus = status === 'active' || status === 'approved';
            const okRole = role === 'admin' || role === 'superAdmin';
            const isAdminUser = adminDoc.exists() && okRole && okStatus;

            console.log('[admin check] end isAdmin=', !!isAdminUser);
            setIsAdmin(!!isAdminUser);
          } catch (error: any) {
            console.log('[admin check] catch e.code', error?.code, 'e.message', error?.message);
            const isOfflineError =
              error?.code === 'unavailable' ||
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
        } finally {
          setAdminLoading(false);
        }

        // Ensure user profile exists in background (non-blocking).
        // Only do this if Firestore is available, otherwise skip.
        if (db) {
          getUserProfile(fbUser.uid)
            .then((existingProfile) => {
              if (!existingProfile) {
                return createUserProfile(
                  fbUser.uid,
                  fbUser.email || '',
                  fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                  fbUser.photoURL || undefined
                ).then(() => {
                  console.log('[profile] created on login');
                });
              }
            })
            .catch((err) => {
              const isOfflineError = err?.code === 'unavailable' || err?.message?.includes('offline');
              if (!isOfflineError) {
                console.error('[profile] failed on login', err);
              }
            });
        }
      } else {
        setAdminLoading(false);
        setIsAdmin(false);
        setUserDoc(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load users/{uid} doc for role/status gating (guarded when Firestore is disabled)
  useEffect(() => {
    if (!user?.uid) {
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }
    if (!db) {
      // Firebase disabled: keep app running; no userDoc available
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }

    const uid = user.uid;
    const email = user.email ?? '';
    const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'User';

    let cancelled = false;
    setUserDocLoading(true);

    const load = async () => {
      let userDocResult = await getUserDoc(uid);
      if (cancelled) return;

      if (!userDocResult) {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;
        userDocResult = await getUserDoc(uid);
      }
      if (cancelled) return;

      if (!userDocResult) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;
        userDocResult = await getUserDoc(uid);
      }
      if (cancelled) return;

      if (!userDocResult) {
        try {
          // If admins/{uid} exists, bootstrap as admin. Otherwise normal doc.
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          if (adminSnap.exists() || (user.email && ADMIN_EMAILS.includes(user.email))) {
            userDocResult = await ensureUserDoc(uid, email, displayName, { status: 'active', role: 'admin' });
          } else {
            userDocResult = await ensureUserDoc(uid, email, displayName);
          }
        } catch (e) {
          if (!cancelled) {
            setUserDoc(null);
            setUserDocLoading(false);
          }
          return;
        }
      }

      if (!cancelled) {
        setUserDoc(userDocResult);
        setUserDocLoading(false);
        if (userDocResult.status === 'active' && userDocResult.role === 'admin') setIsAdmin(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, user?.displayName]);

  const requireAuthEnabled = () => {
    if (!auth) throw new Error('Firebase is disabled (missing VITE_FIREBASE_* env vars).');
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      requireAuthEnabled();
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      console.log('Login successful:', userCredential.user.email);
    } catch (error: any) {
      console.error('Firebase login error:', error);

      if (isDomainBlockingError(error)) {
        console.error('🚫 DOMAIN BLOCKING ERROR DETECTED');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        logAuthDiagnostics();
        console.error('📋 Fix instructions:', getDomainBlockingErrorMessage(error));
      }

      throw error;
    }
  };

  const register = async (email: string, password: string, recaptchaVerifier?: RecaptchaVerifier): Promise<void> => {
    try {
      requireAuthEnabled();

      // Self-signup: no email verification sent or required; user gets access immediately.
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      console.log('[signup] success', userCredential.user.email);

      // Auto-create user profile (only if Firestore is available)
      if (db) {
        try {
          const existingProfile = await getUserProfile(userCredential.user.uid);
          if (!existingProfile) {
            await createUserProfile(
              userCredential.user.uid,
              email,
              userCredential.user.displayName || email.split('@')[0],
              userCredential.user.photoURL || undefined
            );
            console.log('[profile] created on signup');
          }
        } catch (profileError) {
          console.error('[profile] failed on signup', profileError);
        }

        // Eagerly create the users/{uid} doc
        try {
          await ensureUserDoc(userCredential.user.uid, email, userCredential.user.displayName || email.split('@')[0]);
          console.log('User doc ensured on registration');
        } catch (userDocError) {
          console.error('Error ensuring user doc on registration:', userDocError);
        }
      }
    } catch (error: any) {
      console.error('[signup] failure', error?.code, error?.message);
      throw error;
    }
  };

  const signInWithGoogleFn = async (): Promise<void> => {
    requireAuthEnabled();

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth!, provider);
      const fbUser = result.user;
      console.log('[google-signin] success', fbUser.email);

      // Check if a Firestore users/{uid} doc already exists.
      // If it does, the user had a previous account — we reuse it (no duplicate).
      // If not, onAuthStateChanged will create one via ensureUserDoc (merge:true).
      if (db && fbUser.email) {
        const existingUserDoc = await getUserDoc(fbUser.uid);
        if (existingUserDoc) {
          console.log('[google-signin] existing user doc found — reusing, no duplicate created');
        } else {
          console.log('[google-signin] no existing user doc — onAuthStateChanged will create one');
        }
      }
    } catch (error: any) {
      console.error('[google-signin] failure', error?.code, error?.message);

      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled.');
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
        // The Google email matches an existing email/password account.
        // Inform the user so they can log in with password first, then link Google.
        const email = error.customData?.email;
        throw new Error(
          `An account already exists with ${email || 'this email'} using a different sign-in method. ` +
          `Please log in with your email and password first, then link your Google account from your profile.`
        );
      }
      if (isDomainBlockingError(error)) {
        logAuthDiagnostics();
        throw new Error(getDomainBlockingErrorMessage(error));
      }
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    requireAuthEnabled();

    const currentUser = auth!.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to link a Google account.');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await linkWithPopup(currentUser, provider);
    } catch (error: any) {
      if (
        error.code === 'auth/credential-already-in-use' ||
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        throw new Error(
          'That Google account is already linked to another account. Please use a different Google account.'
        );
      }
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Linking was cancelled.');
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups and try again.');
      }
      throw error;
    }
  };

  const linkEmailPassword = async (password: string) => {
    requireAuthEnabled();

    const currentUser = auth!.currentUser;
    if (!currentUser?.email) {
      throw new Error('You must be signed in with an email to set a password.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await linkWithCredential(currentUser, credential);
  };

  const resetPassword = async (email: string) => {
    try {
      requireAuthEnabled();
      await sendPasswordResetEmail(auth!, email);
      console.log('Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (isDomainBlockingError(error)) {
        console.error('🚫 DOMAIN BLOCKING ERROR DETECTED');
        logAuthDiagnostics();
        console.error('📋 Fix instructions:', getDomainBlockingErrorMessage(error));
      }

      throw error;
    }
  };

  const logout = async () => {
    requireAuthEnabled();
    await signOut(auth!);
  };

  const value: AuthContextType = {
    user,
    isAdmin,
    loading,
    adminLoading,
    userDoc,
    userDocLoading,
    userRole: userDoc?.role ?? null,
    userStatus: userDoc?.status ?? null,
    isActive: (userDoc?.status ?? '') === 'active',
    login,
    register,
    signInWithGoogle: signInWithGoogleFn,
    linkGoogleAccount,
    linkEmailPassword,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};