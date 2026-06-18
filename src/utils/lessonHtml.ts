// Pure, framework-free helpers for the in-browser weekly-lesson editor.
// No Firebase, no React — easy to reason about and unit-test.
//
// A lesson is a full standalone HTML document (DOCTYPE + <html> + <head> with
// per-week inline styles/scripts + <body data-week="N">). It references
// styles.css / script.js / audio relatively; the viewer rewrites those to
// signed Storage URLs at read time. The editor keeps the parsed Document as
// the session source of truth and only ever changes the innerHTML of tagged
// "editable regions", so <head>, scripts, comments and untouched nodes survive
// byte-for-byte.

/** Attribute used to tag editable regions so Visual edits map back to the
 *  exact node. Stripped from anything we save. */
export const LCE_EDIT_ID_ATTR = 'data-lce-edit-id';

/** Prose regions that become editable hosts in Visual mode: each section's
 *  accordion-content (Concept, In Practice, Practices, Info, Resources + any
 *  bonus sections) and the hero title. Structural wrappers, nav and scripts
 *  are deliberately NOT editable. */
export const EDITABLE_SELECTORS = ['header.hero h1', '.accordion-content'];

export function parseLesson(raw: string): Document {
  return new DOMParser().parseFromString(raw, 'text/html');
}

/** Tag each editable region with a stable, document-order id. Idempotent —
 *  clears prior marks first so re-marking a re-parsed doc yields the same ids
 *  as long as the structure is unchanged. */
export function markEditableRegions(doc: Document): void {
  doc.querySelectorAll('[' + LCE_EDIT_ID_ATTR + ']').forEach((el) => el.removeAttribute(LCE_EDIT_ID_ATTR));
  let i = 0;
  for (const sel of EDITABLE_SELECTORS) {
    doc.querySelectorAll(sel).forEach((el) => {
      el.setAttribute(LCE_EDIT_ID_ATTR, 'r' + i);
      i += 1;
    });
  }
}

/** Serialize to a clean full-document HTML string for saving / HTML mode /
 *  preview. Strips edit-only marks so the stored file stays pristine. */
export function serializeClean(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;
  clone.querySelectorAll('[' + LCE_EDIT_ID_ATTR + ']').forEach((el) => el.removeAttribute(LCE_EDIT_ID_ATTR));
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('[spellcheck]').forEach((el) => el.removeAttribute('spellcheck'));
  const editStyle = clone.getElementById('__lce_edit_style');
  if (editStyle) editStyle.remove();
  return '<!DOCTYPE html>\n' + clone.documentElement.outerHTML + '\n';
}

const EDIT_AFFORDANCE_CSS = `
  /* Force every accordion open so all text is visible+editable without JS. */
  .accordion-body, .accordion-body.open { max-height: none !important; overflow: visible !important; transition: none !important; }
  [${LCE_EDIT_ID_ATTR}] { outline: 1px dashed rgba(13,148,136,0.35); outline-offset: 4px; border-radius: 2px; }
  [${LCE_EDIT_ID_ATTR}]:hover { outline-color: rgba(13,148,136,0.6); }
  [${LCE_EDIT_ID_ATTR}]:focus, [${LCE_EDIT_ID_ATTR}]:focus-visible { outline: 2px solid #0d9488; }
`;

/** Serialize for the editable iframe: stylesheet pointed at the signed Storage
 *  URL (so it looks like the real lesson), scripts removed (so they don't fight
 *  contentEditable), all accordions forced open, editable regions made
 *  contentEditable. */
export function serializeForDisplay(doc: Document, cssUrl: string): string {
  const clone = doc.cloneNode(true) as Document;
  clone.querySelectorAll('link[rel="stylesheet"]').forEach((lnk) => {
    const href = lnk.getAttribute('href') || '';
    if (href === 'styles.css' || href.endsWith('/styles.css')) lnk.setAttribute('href', cssUrl);
  });
  clone.querySelectorAll('script').forEach((s) => s.remove());
  clone.querySelectorAll('[' + LCE_EDIT_ID_ATTR + ']').forEach((el) => {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
  });
  const style = clone.createElement('style');
  style.id = '__lce_edit_style';
  style.textContent = EDIT_AFFORDANCE_CSS;
  clone.head?.appendChild(style);
  return '<!DOCTYPE html>\n' + clone.documentElement.outerHTML;
}

/** The week's display title — the hero <h1> text. */
export function deriveTitle(doc: Document): string {
  const h1 = doc.querySelector('header.hero h1') || doc.querySelector('h1');
  return (h1?.textContent || '').replace(/\s+/g, ' ').trim();
}

export interface SanityResult {
  ok: boolean;
  reason?: string;
}

/** Fast client-side structural validation — the live "still intact?" check.
 *  Not a real compiler; catches the realistic ways a lesson gets broken
 *  (truncation, deleted sections, an unclosed tag, a bad paste, a removed
 *  asset reference). */
export function sanityCheck(html: string, weekNumber: number): SanityResult {
  if (!html || html.trim().length < 5000) return { ok: false, reason: 'Content looks truncated (too short).' };
  if (html.length > 500000) return { ok: false, reason: 'Content is unusually large (possible bad paste).' };

  let doc: Document;
  try {
    doc = parseLesson(html);
  } catch {
    return { ok: false, reason: 'HTML could not be parsed.' };
  }
  const body = doc.body;
  if (!body) return { ok: false, reason: 'Missing <body>.' };
  const dataWeek = body.getAttribute('data-week');
  if (!dataWeek) return { ok: false, reason: 'Missing <body data-week>.' };
  if (String(dataWeek) !== String(weekNumber)) {
    return { ok: false, reason: `<body data-week> is "${dataWeek}", expected "${weekNumber}".` };
  }
  const h1 = doc.querySelector('header.hero h1') || doc.querySelector('h1');
  if (!h1 || !(h1.textContent || '').trim()) return { ok: false, reason: 'Missing or empty hero title (<h1>).' };
  if (!/href=["']styles\.css["']/.test(html)) return { ok: false, reason: 'Missing styles.css reference.' };
  if (!/src=["']script\.js["']/.test(html)) return { ok: false, reason: 'Missing script.js reference.' };

  // Tag-balance heuristics — an unclosed script/style/section swallows the page.
  const pairs: Array<[string, string]> = [
    ['<script', '</script>'],
    ['<style', '</style>'],
    ['<section', '</section>'],
  ];
  for (const [open, close] of pairs) {
    const o = (html.match(new RegExp(open, 'gi')) || []).length;
    const c = (html.match(new RegExp(close, 'gi')) || []).length;
    if (o !== c) return { ok: false, reason: `Unbalanced ${open}> / ${close} (${o} vs ${c}).` };
  }

  const sections = doc.querySelectorAll('section.section-card').length;
  if (sections < 3) return { ok: false, reason: `Only ${sections} section(s) found — structure may be broken.` };

  return { ok: true };
}

/** Read current innerHTML of every editable region in a rendered document
 *  (e.g. the edit iframe). Returns an id→innerHTML map. */
export function readRegionEdits(renderedDoc: Document): Record<string, string> {
  const out: Record<string, string> = {};
  renderedDoc.querySelectorAll('[' + LCE_EDIT_ID_ATTR + ']').forEach((el) => {
    const id = el.getAttribute(LCE_EDIT_ID_ATTR);
    if (id) out[id] = el.innerHTML;
  });
  return out;
}

/** Apply region edits (id→innerHTML) back into the kept document's nodes. */
export function applyRegionEdits(doc: Document, edits: Record<string, string>): void {
  for (const [id, html] of Object.entries(edits)) {
    const node = doc.querySelector('[' + LCE_EDIT_ID_ATTR + '="' + id + '"]');
    if (node) node.innerHTML = html;
  }
}
