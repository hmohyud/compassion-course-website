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
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
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

// Per-week theme colors mirrored from the website lessons (each week's
// --wk-primary / --wk-primary-dark). The lessons cycle 8 themes by (week mod 8);
// we reproduce that exactly so a week's workbook page matches its website color.
// Protected weeks (1–4, 10, 22) have no website theme, so they inherit the same
// (n % 8) slot — keeping the whole book on one consistent cycle. We use the
// deeper "dark" tone for the filled banner/box headers so white text stays
// readable on all eight.
const THEME_CYCLE = [
  { name: 'plum',       primary: '6E4870', dark: '4F3252' }, // n % 8 === 0
  { name: 'teal',       primary: '2A7A6E', dark: '1F5C52' }, // 1
  { name: 'amber',      primary: 'A16A2C', dark: '7A4F1D' }, // 2
  { name: 'slate',      primary: '456A85', dark: '324D61' }, // 3
  { name: 'rose',       primary: 'A06168', dark: '7A474D' }, // 4
  { name: 'forest',     primary: '3F6A4A', dark: '2C4D35' }, // 5
  { name: 'terracotta', primary: '9A5638', dark: '724026' }, // 6
  { name: 'gold',       primary: 'A8843E', dark: '7A5F2C' }, // 7
];
function weekTheme(n) { return THEME_CYCLE[n % 8]; }
const TEAL_TINT = 'E9F2F0';
const GOLD = 'B8860B';
const INK = '2D2D2D';
const MUTE = '6B6B6B';
const ANSWER_BG = 'FCFBF7';   // very light cream so the input area reads as fillable
const RULE = 'CFE3DF';

const CONTENT_W = 9360;       // US Letter, 1" margins

// ── helpers ────────────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

// One answer box: a shaded header row (the label / anchor) + a single empty
// row the participant types into. `widths` sums to CONTENT_W.
function answerTable(prompt, widths, height, headerFill = TEAL) {
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
  const bodyCells = widths.map((w) =>
    new TableCell({
      borders: cellBorders,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: ANSWER_BG, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '', size: 20 })] })],
    }));
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

function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 60, before: opts.before ?? 0, line: opts.line ?? 276, lineRule: 'auto' },
    keepLines: true,
    children: quoteRuns(text, opts),
  });
}

// Render template text with the ____ blanks as UNDERLINE-formatted spaces rather
// than literal underscore characters. With underscores, typing into the blank
// leaves the typed text sitting beside the underscores (not on a line); with an
// underlined run, the text a participant types inherits the underline and sits
// ON the line, and the line grows with it.
function blankRuns(text, opts = {}) {
  const size = opts.size ?? 20;
  const color = opts.color ?? INK;
  const out = [];
  const re = /_{3,}/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), italics: true, size, color }));
    out.push(new TextRun({ text: ' '.repeat(Math.max(14, m[0].length + 4)), underline: { type: 'single' }, size, color }));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), italics: true, size, color }));
  return out;
}

// A fill-in-the-blank model phrase (one containing ____ blanks) rendered as a
// clearly editable cream input box — same fill styling as the answer boxes — so
// participants complete it in a designated space instead of accidentally
// editing the surrounding instructions. Shown italic with a ✎ cue + curly
// quotes; the blanks are underlined writing spaces (see blankRuns).
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
        margins: { top: 90, bottom: 90, left: 130, right: 130 },
        children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276, lineRule: 'auto' },
          children: [
            new TextRun({ text: '✎  ', color: accent, size: 18 }),
            new TextRun({ text: '“', italics: true, size: 20, color: INK }),
            ...blankRuns(text.trim(), { size: 20, color: INK }),
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

function planWeek(wk) {
  const n = wk.practices.length;

  if (GENUINE_OVERFLOW.has(wk.n)) {
    // Let it overflow with generous boxes so the 2nd page carries real
    // writing space rather than looking blank.
    return { practiceBox: COMF_PRACTICE_BOX, reflBox: COMF_REFL_BOX, overflow: true };
  }

  // Fits on one page. Size boxes from a deliberately conservative estimate
  // so the fill never overshoots and tips the week over; borderline weeks
  // fall back to the small floor (and still fit, per the probe).
  const headFixed = H_WEEK + (wk.title ? H_TITLE : 0) + H_REFL + REFL_HEADER
    + wk.practices.reduce((a, pr) => {
        const headLen = (`Practice #9 — ${pr.title || ''}`).length;
        return a + H_PRACTICE + (headLen > 50 ? H_PRACTICE_WRAP : 0) + BOX_HEADER;
      }, 0);
  const available = PAGE_USABLE - FIT_SAFETY - headFixed - descTwips(wk.practices);
  let reflBox = Math.min(MAX_REFL_BOX, Math.max(MIN_REFL_BOX, Math.round(available * 0.22)));
  let practiceBox = n > 0 ? Math.round((available - reflBox) / n) : 0;
  practiceBox = Math.min(MAX_PRACTICE_BOX, Math.max(MIN_PRACTICE_BOX, practiceBox));
  if (n > 0 && practiceBox * n + reflBox > available) {
    practiceBox = Math.max(MIN_PRACTICE_BOX, Math.floor((available - reflBox) / n));
  }
  return { practiceBox, reflBox, overflow: false };
}

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
    children: [new TextRun({ text: '2026 – 2027', color: GOLD, size: 30, font: 'Georgia', characterSpacing: 80 })] }),
  new Paragraph({ spacing: { before: 40, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'PARTICIPANT WORKBOOK', bold: true, color: TEAL_DARK, size: 19, font: 'Georgia', characterSpacing: 130 })] }),
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

// How to Use
children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 340, after: 60 },
  children: [new TextRun('How to Use This Workbook')] }));
children.push(bodyPara(
  'This is your own private copy of The Compassion Course workbook, opened from the personal link we send you — there is nothing to download, install, or back up. Your writing saves automatically as you go, and every shaded box grows to fit whatever you type.'
));
children.push(bodyPara(
  'Please write only inside the cream-colored boxes. Everything else on the page is the course’s material; keeping your responses in the boxes is what lets us find and confirm your work at the end of the year.'
));

// Certificate of Completion
children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 60 },
  children: [new TextRun('Certificate of Completion (COC)')] }));
[
  'Use this workbook to record and track your weekly progress through the course.',
  'We will email you weekly reminders and helpful hints to keep you on track.',
  'If you registered for the Certificate of Completion, please fill out every prompt.',
  'At the end of the course year, a Compassion Course faculty member will confidentially confirm that you completed your work. This is a completion check — it does not include mentoring or feedback.',
  'Completing your workbook is part of qualifying to become a Mentor the following year.',
].forEach((t) => children.push(bodyPara(t, { after: 60 })));

// ── per-week sections (each week starts on its own page) ─────────────────────
// Each week starts on a fresh page. Answer-box heights are computed per week
// (see fitBoxes) so the content fills the page with comfortable, even
// spacing and lands cleanly on one page — no cramped feel, no near-blank
// overflow. Boxes still expand further in Google Docs as the participant
// types.
weeks.forEach((wk) => {
  const { practiceBox, reflBox } = planWeek(wk);
  // This week's theme color (matches its website page). The deep "dark" tone
  // fills the banner and box headers (white text stays readable on all eight)
  // and colors the lesson title.
  const theme = weekTheme(wk.n);
  const wkColor = theme.dark;

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
      keepNext: true, children: [new TextRun(`Practice #${num}${pr.title ? ' — ' + pr.title : ''}`)] }));
    // Constant comfortable body size + line spacing (bodyPara defaults).
    // Fill-in-the-blank templates are split out into designated input boxes.
    pr.desc.forEach((d) => pushDesc(children, d, wkColor));
    // Answer box. Header text doubles as the automation anchor
    // ("Week N · Practice #X"). Sized by planWeek; grows in Google Docs.
    children.push(answerTable(`Your response  ·  Week ${wk.n} · Practice #${num}`, [CONTENT_W], practiceBox, wkColor));
  });

  // Reflections & Notes (3 columns)
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 },
    keepNext: true, children: [new TextRun('Reflections & Notes')] }));
  children.push(answerTable(
    ['Insights', 'A real-life situation I approached in a new way', 'My intentions for next week'],
    [3120, 3120, 3120],
    reflBox,
    wkColor,
  ));
});

// ── document ────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'The Compassion Course',
  title: 'The Compassion Course 2026–2027 Workbook',
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
      default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
        children: [
          new TextRun({ text: 'The Compassion Course  ·  2026–2027 Workbook', color: MUTE, size: 16 }),
          new TextRun({ text: '\t', size: 16 }),
          new TextRun({ children: ['Page ', PageNumber.CURRENT], color: MUTE, size: 16 }),
        ],
      })] }),
    },
    children,
  }],
});

const outPath = path.join(__dirname, 'The Compassion Course 2026-2027 Workbook.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, '(' + (buf.length / 1024).toFixed(0) + ' KB)');
  console.log('weeks:', weeks.length, ' practices:', weeks.reduce((a, w) => a + w.practices.length, 0));
});
