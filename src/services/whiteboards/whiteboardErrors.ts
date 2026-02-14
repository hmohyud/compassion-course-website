export interface WhiteboardError {
  code: string;
  message: string;
}

export function normalizeError(e: unknown): WhiteboardError {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
    const msg = (e as { message: string }).message;
    const code = e && typeof e === 'object' && 'code' in e && typeof (e as { code: string }).code === 'string'
      ? (e as { code: string }).code
      : 'unknown';
    return { code, message: msg || fallbackMessage(code) };
  }
  if (e instanceof Error) {
    const code = e && typeof e === 'object' && 'code' in e && typeof (e as { code: string }).code === 'string'
      ? (e as { code: string }).code
      : 'error';
    return { code, message: e.message || fallbackMessage(code) };
  }
  return { code: 'unknown', message: String(e) || 'Something went wrong.' };
}

function fallbackMessage(code: string): string {
  if (code === 'permission-denied') {
    return 'Permission denied. Make sure you’re a member of this team or an admin, and that Firestore rules are deployed.';
  }
  return 'Something went wrong. Try again or check the console for details.';
}

export function messageFromCaught(e: unknown): string {
  return normalizeError(e).message;
}
