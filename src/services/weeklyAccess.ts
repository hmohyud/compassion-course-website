// Single-password (hash) access gate for the 2026 Member Portal / Lesson
// Library. The course is delivered by email and the email link carries the
// access hash (…/weekly?hash=…). There is no longer an email roster — this one
// hash is the access password.
//
// This is a low-security, client-side gate (the hash is in the bundle): it
// keeps the library from being casually browsable. The real protection is that
// only people we email have the link. Admins always have access via their
// normal login.

const ACCESS_HASH = 'aede5c4ac29ca1fd0d2381c8be80e6ea2c9e';
const KEY = 'cco_weekly_access_v1';

export function hasWeeklyAccess(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function grantWeeklyAccess(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* private mode / quota */ }
}

export function clearWeeklyAccess(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * Process a `?hash=…` access link on first render: if the hash matches, grant
 * access (persisted to localStorage) and strip the hash from the address bar so
 * it doesn't linger in history/shareable URLs. Returns whether access is
 * currently granted (from this link or a previous visit).
 */
export function processWeeklyAccessLink(): boolean {
  if (typeof window === 'undefined') return false;
  let hash: string | null = null;
  try {
    hash = new URLSearchParams(window.location.search).get('hash');
  } catch {
    return hasWeeklyAccess();
  }
  if (hash && hash.trim() === ACCESS_HASH) {
    grantWeeklyAccess();
    try {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    } catch { /* old browsers — leave URL as-is */ }
  }
  return hasWeeklyAccess();
}
