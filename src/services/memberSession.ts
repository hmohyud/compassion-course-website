// Lightweight client-side member session for the 2026 Member Portal.
// Storing the email in localStorage is intentionally low-security —
// the user (Thom) signed off on email-only "auth". The roster check
// against Firestore is the actual gate; this just remembers who said
// they were when they typed the email so we don't ask again.

const KEY = 'cco_member_email_v1';

export function getMemberSessionEmail(): string | null {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function setMemberSessionEmail(email: string): void {
  try {
    localStorage.setItem(KEY, email.trim().toLowerCase());
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

export function clearMemberSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
