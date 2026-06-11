/**
 * Build "The Compassion Course 2026–2027 Workbook" as a .docx.
 *
 * One document covering all 52 weeks. Every answer goes in a clearly
 * bordered table cell (Google-Docs friendly: DXA widths, dual widths,
 * ShadingType.CLEAR). Distribution model: each participant opens their own
 * private Google-Docs copy from a link we send — nothing to download or
 * back up. Cells expand as they type.
 *
 * Layout goals:
 *   - Cover + intro fit on page 1.
 *   - Each week is kept compact so it fits on a single page where possible
 *     (avoids a near-blank overflow page).
 *   - Answer boxes are short by default (they grow in Google Docs as you
 *     type) so the page isn't dominated by empty space.
 *
 * Run from .local-workbook/ (docx resolves from the project's node_modules):
 *   node build-workbook.cjs
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, ExternalHyperlink, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  HeightRule, HeadingLevel, PageBreak, VerticalAlign,
  Footer, PageNumber, TabStopType, TabStopPosition,
} = require('docx');

// Heart-globe logo for the cover (319×261 → ratio ~1.22).
const heartLogo = fs.readFileSync(path.join(__dirname, '..', 'public', 'logo_heart.png'));

// ── palette ──────────────────────────────────────────────────────────────
const TEAL = '2A7A6E';
const TEAL_DARK = '1E5C53';
// Distinct deep navy (from the logo / heart-globe); kept as the Heading1 style's
// fallback banner color, though every week overrides it with its theme color.
const WEEK_BANNER = '0F3760';

// A distinct color for every one of the 52 weeks. We step the hue by the golden
// angle (~137.5°) per week so consecutive weeks land far apart on the wheel
// (never a near-duplicate color close in time) while all 52 stay well spread.
// Saturation is muted and the lightness is auto-darkened until white text clears
// a 4.5:1 contrast ratio — so the same tone works as a filled banner/box header
// (white text on it) and as the lesson-title text (the color on white).
// (This intentionally no longer mirrors the website's 8-theme cycle — 8 colors
// can't make 52 weeks distinct.)
const HUE_BASE = 36.5;        // so week 1 lands on a teal-ish hue
const GOLDEN_ANGLE = 137.508;
const WEEK_SAT = 0.30;        // muted saturation → calm, soothing tones (not vivid)
const CONTRAST_MIN = 4.8;     // white-on-color must clear this (a little over AA 4.5)
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase();
  return to(r) + to(g) + to(b);
}
function relLum(hex) {
  const ch = (i) => { const c = parseInt(hex.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}
function whiteContrast(hex) { return 1.05 / (relLum(hex) + 0.05); }
// Darken a hue at the given saturation from a starting lightness until white
// text clears CONTRAST_MIN. Returns { hex, l }.
function settleTone(hue, sat, lStart) {
  let l = lStart, hex = hslToHex(hue, sat, l);
  while (l > 0.13 && whiteContrast(hex) < CONTRAST_MIN) { l -= 0.02; hex = hslToHex(hue, sat, l); }
  return { hex, l };
}
// A distinct, soothing color per week. `primary` is the medium tone shared by
// the workbook banner/title AND the website --wk-primary; `dark` is a deeper
// shade of the same hue for the website gradient / hover end.
function weekColor(n) {
  const hue = (HUE_BASE + n * GOLDEN_ANGLE) % 360;
  const p = settleTone(hue, WEEK_SAT, 0.46);
  const primary = p.hex;
  const dark = hslToHex(hue, WEEK_SAT, Math.max(0.12, p.l - 0.09));
  return { primary, dark };
}
const TEAL_TINT = 'E9F2F0';
const GOLD = 'B8860B';
const INK = '2D2D2D';
const MUTE = '6B6B6B';
const ANSWER_BG = 'F2ECDC';   // warm cream — clearly distinct from the white page (per Thom: was too faint)
const RULE = 'CFE3DF';
const BLANK_FILL = 'E4E7EC';  // light gray field background for fill-in blanks
const BLANK_LINE = '8A9099';  // soft gray underline beneath a fill-in blank

const CONTENT_W = 9360;       // US Letter, 1" margins

// ── helpers ────────────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

// One answer box: a shaded header row (the label / anchor) + a single empty
// row the participant types into. `widths` sums to CONTENT_W.
function answerTable(prompt, widths, height, headerFill = TEAL, opts = {}) {
  const headers = Array.isArray(prompt) ? prompt : [prompt];
  const single = !Array.isArray(prompt);
  const headerCells = headers.map((p, i) =>
    new TableCell({
      borders: cellBorders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: headerFill, type: ShadingType.CLEAR },
      margins: { top: 40, bottom: 40, left: 110, right: 110 },
      children: [new Paragraph({ spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: (single ? '✎  ' : '') + p, bold: true, color: 'FFFFFF', size: 18 })] })],
    }));
  // mergeBody: one full-width answer cell under a multi-column header (the
  // column labels are just guides, not separate required answers).
  const emptyCell = (w, span) => new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    ...(span ? { columnSpan: span } : {}),
    shading: { fill: ANSWER_BG, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '', size: 20 })] })],
  });
  const bodyCells = (opts.mergeBody && widths.length > 1)
    ? [emptyCell(CONTENT_W, widths.length)]
    : widths.map((w) => emptyCell(w));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      // cantSplit keeps the box from breaking across a page boundary.
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
      new TableRow({ cantSplit: true, height: { value: height, rule: HeightRule.ATLEAST }, children: bodyCells }),
    ],
  });
}

// Split a paragraph into runs, rendering double-quoted spans (model phrases the
// participant might say) as elegant italic with curly “ ” typographic quotes.
// Quote chars are only added back where we removed them, so the visible length
// is unchanged (the page-fit estimator stays valid). Paragraphs whose quotes
// don't balance are left plain so nothing gets mangled.
function quoteRuns(text, opts = {}) {
  const size = opts.size ?? 20;
  const color = opts.color ?? INK;
  const baseItalic = !!opts.italics;
  const parts = text.split('"');
  // N quote chars → N+1 parts; balanced ⟺ even N ⟺ odd part count.
  if (parts.length % 2 === 0) {
    return [new TextRun({ text, size, color, italics: baseItalic })];
  }
  const runs = [];
  parts.forEach((seg, i) => {
    if (i % 2 === 0) {
      if (seg) runs.push(new TextRun({ text: seg, size, color, italics: baseItalic }));
    } else {
      runs.push(new TextRun({ text: '“' + seg + '”', size, color, italics: true }));
    }
  });
  return runs;
}

// ── hyperlinks ───────────────────────────────────────────────────────────────
// Phrases turned into clickable links throughout the workbook. Order matters:
// longer / more specific phrases are listed first so they win over shorter ones.
const NEEDS_URL = 'https://compassioncourse.org/needs.html';
const FEEL_URL  = 'https://compassioncourse.org/feelings.html';
// Join links route through our gateway/help page (sign-up vs sign-in triage)
// rather than straight to Circle's auth, per Thom's support-call concern.
const GCN_JOIN  = 'https://compassioncourse.org/gcn.html';
const GCN_ACCESS = 'https://www.theglobalcompassionnetwork.com/';
const EXERCISE_URL = 'https://www.nycnvc.org/the-exercise';
const CC_URL = 'https://www.compassioncourse.org';
const LINK_COLOR = '1155CC';
const LINK_RULES = [
  { phrase: 'New to the GCN? Click Here to Join', url: GCN_JOIN },
  { phrase: 'GCN Members Click Here to Access it', url: GCN_ACCESS },
  { phrase: "If you haven't already, Click Here to Join the GCN", url: GCN_JOIN },
  { phrase: 'nycnvc.org/the-exercise', url: EXERCISE_URL },
  { phrase: 'www.compassioncourse.org', url: CC_URL },
  { phrase: 'feelings list', url: FEEL_URL },
  { phrase: 'needs list', url: NEEDS_URL },
];

function findLinks(text) {
  const lower = text.toLowerCase();
  const matches = [];
  LINK_RULES.forEach((rule) => {
    const p = rule.phrase.toLowerCase();
    let from = 0, i;
    while ((i = lower.indexOf(p, from)) !== -1) {
      matches.push({ start: i, end: i + rule.phrase.length, url: rule.url });
      from = i + rule.phrase.length;
    }
  });
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const out = [];
  let lastEnd = 0;
  matches.forEach((m) => { if (m.start >= lastEnd) { out.push(m); lastEnd = m.end; } });
  return out;
}

// Like quoteRuns, but also turns known phrases (needs list, feelings list, the
// exercise, GCN, compassioncourse.org) into clickable hyperlinks. Returns a mix
// of TextRun and ExternalHyperlink for a paragraph's children.
function richRuns(text, opts = {}) {
  const links = findLinks(text);
  if (!links.length) return quoteRuns(text, opts);
  const size = opts.size ?? 20;
  const runs = [];
  let pos = 0;
  links.forEach((lk) => {
    if (lk.start > pos) runs.push(...quoteRuns(text.slice(pos, lk.start), opts));
    runs.push(new ExternalHyperlink({
      link: lk.url,
      children: [new TextRun({ text: text.slice(lk.start, lk.end), size, color: LINK_COLOR, underline: { type: 'single' } })],
    }));
    pos = lk.end;
  });
  if (pos < text.length) runs.push(...quoteRuns(text.slice(pos), opts));
  return runs;
}

function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 60, before: opts.before ?? 0, line: opts.line ?? 276, lineRule: 'auto' },
    keepLines: true,
    ...(opts.bullet ? { bullet: { level: 0 } } : {}),
    children: richRuns(text, opts),
  });
}

// Heading version of richRuns: link runs are styled, but the surrounding runs
// carry no run-props so they inherit the heading's own style (bold/charcoal).
function headingRuns(text) {
  const links = findLinks(text);
  if (!links.length) return [new TextRun(text)];
  const runs = [];
  let pos = 0;
  links.forEach((lk) => {
    if (lk.start > pos) runs.push(new TextRun(text.slice(pos, lk.start)));
    runs.push(new ExternalHyperlink({ link: lk.url, children: [new TextRun({ text: text.slice(lk.start, lk.end), color: LINK_COLOR, underline: { type: 'single' } })] }));
    pos = lk.end;
  });
  if (pos < text.length) runs.push(new TextRun(text.slice(pos)));
  return runs;
}

// Runs for a fill-in template: each ____ blank becomes an INLINE shaded, lightly
// underlined input field (no underscores) that the participant types directly
// into — the highlight grows with the text, so it clearly contains the answer.
// needs/feelings-list references inside the phrase are linked too.
function templateRuns(text, opts = {}) {
  const size = opts.size ?? 20;
  const color = opts.color ?? INK;
  const specials = [];
  let m; const re = /_{3,}/g;
  while ((m = re.exec(text)) !== null) specials.push({ start: m.index, end: m.index + m[0].length, type: 'blank' });
  findLinks(text).forEach((lk) => specials.push({ start: lk.start, end: lk.end, type: 'link', url: lk.url }));
  specials.sort((a, b) => a.start - b.start);
  const clean = []; let lastEnd = 0;
  specials.forEach((s) => { if (s.start >= lastEnd) { clean.push(s); lastEnd = s.end; } });
  const runs = []; let pos = 0;
  clean.forEach((s) => {
    if (s.start > pos) runs.push(new TextRun({ text: text.slice(pos, s.start), italics: true, size, color }));
    if (s.type === 'blank') {
      runs.push(new TextRun({ text: ' '.repeat(10), shading: { fill: BLANK_FILL, type: ShadingType.CLEAR }, underline: { type: 'single', color: BLANK_LINE }, size, color }));
    } else {
      runs.push(new ExternalHyperlink({ link: s.url, children: [new TextRun({ text: text.slice(s.start, s.end), size, color: LINK_COLOR, underline: { type: 'single' } })] }));
    }
    pos = s.end;
  });
  if (pos < text.length) runs.push(new TextRun({ text: text.slice(pos), italics: true, size, color }));
  return runs;
}

// A fill-in template: the model phrase in a cream box, with each blank rendered
// as an INLINE shaded + underlined input field (see templateRuns) that the
// participant types straight into — the field is obviously there for input and
// stretches with the text. The ✎ cue marks it as fillable.
function templateBox(text, accent = TEAL) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ cantSplit: true, children: [
      new TableCell({
        borders: cellBorders,
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: ANSWER_BG, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.TOP,
        margins: { top: 100, bottom: 100, left: 130, right: 130 },
        children: [new Paragraph({ spacing: { before: 0, after: 0, line: 320, lineRule: 'auto' },
          children: [
            new TextRun({ text: '✎  ', color: accent, size: 18 }),
            new TextRun({ text: '“', italics: true, size: 20, color: INK }),
            ...templateRuns(text.trim(), { size: 20, color: INK }),
            new TextRun({ text: '”', italics: true, size: 20, color: INK }),
          ] })],
      })],
    })],
  });
}

// Render one description paragraph. If it embeds a fill-in template (a quoted
// phrase containing ____ blanks), split it: the lead-in instruction stays as
// body text, the template becomes a designated input box, and any trailing text
// follows as body. Otherwise it's an ordinary body paragraph.
function pushDesc(out, d, accent = TEAL) {
  if (!/_{3,}/.test(d)) { out.push(bodyPara(d)); return; }
  const open = d.indexOf('"');
  if (open === -1) { out.push(bodyPara(d)); return; }
  const rest = d.slice(open + 1);
  const close = rest.indexOf('"');
  const template = close === -1 ? rest : rest.slice(0, close);
  if (!/_{3,}/.test(template)) { out.push(bodyPara(d)); return; }
  const lead = d.slice(0, open).trim();
  const tail = (close === -1 ? '' : rest.slice(close + 1)).replace(/^[.\s]+/, '').trim();
  if (lead) out.push(bodyPara(lead, { after: 80 }));
  out.push(templateBox(template, accent));
  if (tail) out.push(bodyPara(tail, { before: 80 }));
}

// ── per-week page-fit planner ────────────────────────────────────────────────
// One comfortable description size and ONE line spacing for every week — we
// never shrink the type or squeeze the leading. Instead we size the answer
// boxes to the space available:
//   • If the week fits on one page with boxes at their minimum, it gets its
//     own page and the boxes grow to fill it nicely (spacious for light
//     weeks; snug-but-readable for borderline ones — e.g. when only the
//     reflections box would otherwise spill).
//   • If the week's text alone is too long to fit even with minimum boxes
//     (it would overflow by more than ~one box), we DON'T fight it — it runs
//     onto a second page with normal-size boxes, so that page has real
//     content rather than looking blank.
// All values in twips (1440 = 1 inch).
// Estimate constants (twips) used to decide whether a week fits one page and
// how tall its boxes can be. Deliberately a touch conservative so the box
// FILL never overshoots and tips a fitting week onto a second page.
const PAGE_USABLE = 13104;      // body height: 15840 − 1440 top − 1296 bottom
const FIT_SAFETY = 560;         // bottom air buffer
const DESC_CPL = 82;            // est. chars per line at the 10pt body size
const DESC_LH = 252;            // est. line height at 10pt / 1.15 spacing
const PARA_AFTER = 64;
const H_WEEK = 640;             // Week heading (Georgia 16pt + rule + spacing)
const H_TITLE = 470;            // italic lesson title
const H_PRACTICE = 540;         // "Practice #N — …" heading (1 line + spacing)
const H_PRACTICE_WRAP = 270;    // extra if that heading wraps to a 2nd line
const H_REFL = 480;             // "Reflections & Notes" heading
const H_EMPATHY = 180;          // extra height on weeks > 10: the reflections heading
                                // row is a touch taller because it also carries the
                                // small Empathy-hours box (it shares that line).
const BOX_HEADER = 400;         // a box's shaded label row
const REFL_HEADER = 600;        // reflections 3-col header row (can be 2 lines)
// Low floor: a borderline week (one that would otherwise spill only its
// reflections box) shrinks its BOXES — never the text or spacing — to stay
// on one page. Boxes grow further in Google Docs, so a small start is fine.
const MIN_PRACTICE_BOX = 300;
const MIN_REFL_BOX = 380;
const MAX_PRACTICE_BOX = 2200;
const MAX_REFL_BOX = 1380;
// Box sizes for weeks we let overflow (kept generous so the 2nd page carries
// real, usable writing space rather than looking blank).
const COMF_PRACTICE_BOX = 820;
const COMF_REFL_BOX = 1300;

function descTwips(practices) {
  let h = 0;
  practices.forEach((pr) => pr.desc.forEach((p) => {
    h += Math.max(1, Math.ceil(p.length / DESC_CPL)) * DESC_LH + PARA_AFTER;
  }));
  return h;
}

// Weeks whose practice text is simply too long to fit one page at the
// constant body size + line spacing — determined empirically by rendering
// with minimum boxes (see the probe in the build notes). These are allowed
// to run onto a second page; every other week is squeezed (boxes only,
// never the text) onto its single page. If the lesson content changes,
// re-run the probe to refresh this set.
const GENUINE_OVERFLOW = new Set([6, 14, 23, 24, 45, 50]);

// Per Thom's feedback: every answer box is a uniform SINGLE line. The boxes
// grow as the participant types (in Google Docs), so a consistent one-line
// start looks cleaner than the old auto-fit which made some weeks' boxes much
// taller than others. (The earlier page-fit machinery above is left in place
// but no longer used.)
const ONE_LINE_BOX = 340; // ATLEAST height ≈ one comfortable typing line
function planWeek() {
  return { practiceBox: ONE_LINE_BOX, reflBox: ONE_LINE_BOX, overflow: false };
}

// Stray GCN join/access lines that the extractor pulled from the weekly
// message's GCN section into the practice text (Thom flagged Week 19 / Practice
// 2; the same lines, duplicated, appear under weeks 19–52). Removed at build.
const STRAY_DESC_RE = /^(new to the gcn\?\s*click here to join|gcn members click here to access(?:\s+it)?)\s*\.?$/i;

// ── load content ─────────────────────────────────────────────────────────
const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8'));
const weeks = content.weeks;

const children = [];

// ── page 1: styled cover + intro ─────────────────────────────────────────────
children.push(
  // heart-globe logo crowning the cover
  new Paragraph({ spacing: { before: 180, after: 40 }, alignment: AlignmentType.CENTER,
    children: [new ImageRun({ data: heartLogo, type: 'png', transformation: { width: 132, height: 108 } })] }),
  // teal rule above the title
  new Paragraph({ spacing: { before: 0, after: 70 }, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 1 } },
    children: [new TextRun({ text: '', size: 2 })] }),
  new Paragraph({ spacing: { before: 90, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'The Compassion Course', bold: true, color: TEAL, size: 54, font: 'Georgia' })] }),
  new Paragraph({ spacing: { before: 110, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '2026-27', color: GOLD, size: 30, font: 'Georgia', characterSpacing: 80 })] }),
  new Paragraph({ spacing: { before: 40, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'CERTIFICATE OF COMPLETION (COC)', bold: true, color: TEAL_DARK, size: 18, font: 'Georgia', characterSpacing: 90 })] }),
  new Paragraph({ spacing: { before: 28, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'PARTICIPANT WORKBOOK', bold: true, color: TEAL_DARK, size: 18, font: 'Georgia', characterSpacing: 130 })] }),
  new Paragraph({ spacing: { before: 110, after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'A year of practicing compassion, one week at a time.', italics: true, color: MUTE, size: 21, font: 'Georgia' })] }),
  // gold divider rule
  new Paragraph({ spacing: { before: 0, after: 230 }, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 1 } },
    children: [new TextRun({ text: '', size: 2 })] }),
);
// "This workbook belongs to" card
children.push(new Paragraph({ spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'THIS WORKBOOK BELONGS TO', bold: true, color: TEAL_DARK, size: 17, characterSpacing: 60 })] }));
children.push(new Table({
  width: { size: 6800, type: WidthType.DXA },
  columnWidths: [1700, 5100],
  alignment: AlignmentType.CENTER,
  rows: [['Name', ''], ['Email', ''], ['Start date', '']].map(([label]) =>
    new TableRow({
      height: { value: 480, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ borders: cellBorders, width: { size: 1700, type: WidthType.DXA },
          shading: { fill: TEAL_TINT, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 150, right: 110 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: label, bold: true, color: TEAL_DARK, size: 21 })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 5100, type: WidthType.DXA },
          shading: { fill: ANSWER_BG, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 110, right: 110 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '', size: 21 })] })] }),
      ],
    })),
}));

// How to Use (consolidated copy per Thom's COC doc)
children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 340, after: 60 },
  children: [new TextRun('How to Use This Workbook')] }));
children.push(bodyPara(
  'This is your own private copy of The Compassion Course Certificate of Completion (COC) workbook. Use it to record and track your weekly progress through the course:',
  { after: 90 }
));
[
  'There is nothing to download, install, or back up.',
  'Please write only inside the cream-colored boxes.',
  'Your writing saves automatically as you go, and every cream-colored box grows to fit whatever you type.',
  'Everything else on the page is the course’s material; keeping your responses in the cream-colored boxes is what lets us find and confirm your work at the end of the year.',
  'Please fill out every prompt.',
].forEach((t) => children.push(bodyPara(t, { bullet: true, after: 60 })));
children.push(bodyPara(
  'We will email you weekly reminders and helpful hints to keep you on track. At the end of the course year, a Compassion Course faculty member will confidentially confirm that you completed your work. This is a completion verification — it does not include mentoring or feedback.',
  { before: 120 }
));

// ── per-week sections (each week starts on its own page) ─────────────────────
// Each week starts on a fresh page. Answer-box heights are computed per week
// (see fitBoxes) so the content fills the page with comfortable, even
// spacing and lands cleanly on one page — no cramped feel, no near-blank
// overflow. Boxes still expand further in Google Docs as the participant
// types.
weeks.forEach((wk) => {
  const { practiceBox, reflBox } = planWeek(wk);
  // This week's distinct, soothing color (see weekColor). The medium "primary"
  // tone fills the banner and box headers (white text on it) and colors the
  // lesson title — and is the same value the website lesson uses for --wk-primary.
  const wkColor = weekColor(wk.n).primary;

  children.push(new Paragraph({
    pageBreakBefore: true,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 40 },
    // Override the Heading1 style's fallback banner color with this week's theme.
    shading: { fill: wkColor, type: ShadingType.CLEAR },
    children: [new TextRun(`Week ${wk.n}`)],
  }));
  if (wk.title) {
    // Lesson title carries this week's theme color — tied to the banner above,
    // distinct from the charcoal practice headings — larger and hung tight under
    // the banner so the two read as one masthead unit.
    children.push(new Paragraph({ spacing: { before: 60, after: 170 }, keepNext: true,
      children: [new TextRun({ text: wk.title, italics: true, color: wkColor, size: 28, font: 'Georgia' })] }));
  }

  if (!wk.practices.length) {
    children.push(bodyPara('Use the reflection space below to capture your practice this week.', { italics: true, color: MUTE }));
  }
  wk.practices.forEach((pr, pi) => {
    const num = pi + 1;
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 },
      keepNext: true, children: [new TextRun(`Practice #${num}${pr.title ? ' — ' : ''}`), ...(pr.title ? headingRuns(pr.title) : [])] }));
    // Constant comfortable body size + line spacing (bodyPara defaults).
    // Fill-in-the-blank templates are split out into designated input boxes.
    // Drop the stray GCN join/access lines that leaked in from the weekly
    // message's GCN section (they don't belong in the practice text and were
    // appearing — duplicated — under weeks 19–52).
    pr.desc.filter((d) => !STRAY_DESC_RE.test(d.trim())).forEach((d) => pushDesc(children, d, wkColor));
    // Answer box. Header text doubles as the automation anchor
    // ("Week N · Practice #X"). Sized by planWeek; grows in Google Docs.
    children.push(answerTable(`Your response  ·  Week ${wk.n} · Practice #${num}`, [CONTENT_W], practiceBox, wkColor));
  });

  // Reflections & Notes (3 columns). On weeks after 10 the heading line also
  // carries a small "Empathy hours" box on the right — so empathy tracking
  // costs no extra vertical space and never tips a week onto a second page.
  if (wk.n > 10) {
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
    children.push(new Paragraph({ spacing: { before: 0, after: 0, line: 150, lineRule: 'exact' }, children: [] }));
    children.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [5560, 2700, 1100],
      rows: [new TableRow({ cantSplit: true, children: [
        // Left: the "Reflections & Notes" heading, styled to match Heading2
        // (charcoal bold + gold left bar).
        new TableCell({ borders: { left: { style: BorderStyle.SINGLE, size: 24, color: GOLD, space: 10 }, top: noBorder, right: noBorder, bottom: noBorder }, width: { size: 5560, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 40, bottom: 40, left: 140, right: 80 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: 'Reflections & Notes', bold: true, size: 23, color: INK, font: 'Arial' })] })] }),
        // Right: "Empathy practice hours" label + a small bordered box, sharing this line.
        new TableCell({ borders: noBorders, width: { size: 2700, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 40, bottom: 40, left: 0, right: 90 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: 'Empathy practice hours', bold: true, size: 20, color: INK })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: ANSWER_BG, type: ShadingType.CLEAR }, width: { size: 1100, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 45, bottom: 45, left: 90, right: 90 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })] }),
      ] })],
    }));
    // Controlled minimal separator between this heading-row table and the answer
    // table below: without it Word auto-inserts a full blank line between two
    // adjacent tables, which is enough to spill a borderline week onto page 2.
    children.push(new Paragraph({ spacing: { before: 0, after: 0, line: 24, lineRule: 'exact' }, children: [new TextRun({ text: '', size: 2 })] }));
  } else {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 },
      keepNext: true, children: [new TextRun('Reflections & Notes')] }));
  }
  children.push(answerTable(
    ['Insights', 'A real-life situation I approached in a new way', 'My intentions for next week'],
    // Unequal columns: widen the middle so its label stays on ONE line
    // (per Thom's feedback) while the side labels also fit on one line.
    [2000, 4660, 2700],
    reflBox,
    wkColor,
    // One merged answer box under the three-column header — the labels are
    // guides, not three separate required answers (per Thom's feedback).
    { mergeBody: true },
  ));
});

// ── document ────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'The Compassion Course',
  title: 'Compassion Course 2026-27 Certificate of Completion (COC) Workbook',
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: INK } } },
    paragraphStyles: [
      // Week heading rendered as a filled teal banner with white text.
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: 'FFFFFF', font: 'Georgia' },
        paragraph: { spacing: { before: 120, after: 130, line: 320, lineRule: 'auto' },
          outlineLevel: 0, keepNext: true,
          shading: { fill: WEEK_BANNER, type: ShadingType.CLEAR },
          // gold hairline accent beneath the navy banner
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 1 } },
          indent: { left: 140 } } },
      // Practice / section heading: neutral charcoal text with a gold accent bar
      // on the left. Charcoal (not teal) so the per-week colored lesson title
      // always stands apart from the practice headings — including on teal weeks.
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, color: INK, font: 'Arial' },
        paragraph: { spacing: { before: 160, after: 70 }, outlineLevel: 1, keepNext: true,
          indent: { left: 180 },
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: GOLD, space: 10 } } } },
    ],
  },
  sections: [{
    properties: { page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1296, left: 1440 },
    } },
    footers: {
      // Footer as a borderless 2-cell table: title hugs the left margin, the
      // page number is hard right-aligned in its own cell. A table (rather than
      // a tab stop) survives Google Docs conversion intact — tabs/nbsp collapse
      // on import, tables + paragraph alignment do not.
      default: new Footer({ children: [new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [6000, 3360],
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: 6000, type: WidthType.DXA },
            margins: { top: 60, left: 0, right: 0, bottom: 0 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
              bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            },
            children: [new Paragraph({ children: [
              new TextRun({ text: "The Compassion Course 2026-27 COC Workbook", color: MUTE, size: 16 }),
            ] })],
          }),
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            margins: { top: 60, left: 0, right: 0, bottom: 0 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
              bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ children: ["Page ", PageNumber.CURRENT], color: MUTE, size: 16 }),
            ] })],
          }),
        ] })],
      })] }),
    },
    children,
  }],
});

const outPath = path.join(__dirname, 'Compassion Course 2026-27 Certificate of Completion (COC) Workbook.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, '(' + (buf.length / 1024).toFixed(0) + ' KB)');
  console.log('weeks:', weeks.length, ' practices:', weeks.reduce((a, w) => a + w.practices.length, 0));
});
