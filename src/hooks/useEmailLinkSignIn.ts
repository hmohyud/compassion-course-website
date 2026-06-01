import { useState } from 'react';
import { setMemberSessionEmail } from '../services/memberSession';

// Stored once per URL-link sign-in attempt and consumed by the email-gate
// UI to show a "this link was for X but X isn't on the roster" message
// instead of the generic "enter your email" form when the roster check
// rejects the link's email.
const LINK_ATTEMPT_FLAG = 'cco_email_link_attempt_v1';

export interface EmailLinkSignInResult {
  /** True if a syntactically valid `?email=...` was present and processed. */
  processed: boolean;
  /** The lowercased email that was stored as the session, or null. */
  email: string | null;
}

/**
 * One-shot processor for `?email=...` sign-in links on the 2026 Member
 * Portal. The course's "password" is just the email used at registration,
 * so a URL like `compassioncourse.org/weekly?email=foo@example.com` is
 * sufficient to drop a member session into localStorage and let the
 * subsequent roster check unlock content.
 *
 * Runs synchronously on first render via a `useState` initializer so it
 * happens BEFORE any other hook (or any read of `getMemberSessionEmail()`)
 * — no flash of the email-entry form before the link is processed.
 *
 * Side effects per page mount when a valid `?email=` is present:
 *   1. `setMemberSessionEmail(email)` — stores the session.
 *   2. `sessionStorage[LINK_ATTEMPT_FLAG] = email` — single-use signal so
 *      a downstream verification failure can render a tailored error.
 *   3. `history.replaceState` — strips the `?email=` from the address bar
 *      so it doesn't sit in browser history / shareable URLs.
 *
 * Returns `{ processed, email }` for callers that want to invalidate
 * cached state on a fresh link sign-in.
 */
export function useEmailLinkSignIn(): EmailLinkSignInResult {
  const [result] = useState<EmailLinkSignInResult>(() => {
    if (typeof window === 'undefined') return { processed: false, email: null };

    let emailParam: string | null = null;
    try {
      emailParam = new URLSearchParams(window.location.search).get('email');
    } catch {
      return { processed: false, email: null };
    }
    if (!emailParam) return { processed: false, email: null };

    const normalized = emailParam.trim().toLowerCase();
    // Cheap syntactic check; the real gate is the Firestore roster lookup.
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      return { processed: false, email: null };
    }

    try {
      setMemberSessionEmail(normalized);
    } catch {
      /* private browsing / storage quota — fall through; verification
         will just re-prompt for the email manually. */
    }
    try {
      sessionStorage.setItem(LINK_ATTEMPT_FLAG, normalized);
    } catch { /* same — non-fatal */ }
    try {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    } catch { /* old browsers — leave the URL as-is */ }

    return { processed: true, email: normalized };
  });
  return result;
}

/**
 * Returns the email from the most recent URL-link sign-in attempt, if
 * any, and clears the flag. Intended to be called by the email-gate UI
 * after verification has resolved — if the roster rejected the link's
 * email, this lets the page show a tailored "we couldn't find that
 * email" message instead of the generic email-entry form.
 */
export function consumeEmailLinkAttempt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(LINK_ATTEMPT_FLAG);
    if (v) sessionStorage.removeItem(LINK_ATTEMPT_FLAG);
    return v;
  } catch {
    return null;
  }
}
