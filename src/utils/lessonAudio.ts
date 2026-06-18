// Browser port of the section-extraction + content-addressed hashing used by
// generate-audio.js and the lesson's runtime script.js. Producing the SAME
// `{hash}.mp3` filenames is critical: that's exactly what the narrate buttons
// look for, so audio generated here lights them up. Keep this in lockstep with
// AUDIO_STRIP_SELECTORS / audioHash() / extractSections() in those files.

// MUST match AUDIO_STRIP_SELECTORS in script.js and STRIP_SELECTORS in generate-audio.js.
export const AUDIO_STRIP_SELECTORS = [
  '.inline-reference-panel', '.inline-ref-trigger',
  '.breathing-widget', '.timer-container',
  '.journal-area', '.journal-saved', '.journal-footer',
  '.word-count', '.copy-btn',
  '.section-read-btn', '.section-narrate-btn',
  '.calendar-buttons', '.progress-ring-container',
  '.rating-slider-container',
  '.needs-panel', '.feelings-panel',
  '.celebration-overlay', '.typewriter-cursor',
  '.dialogue-controls',
].join(', ');

const MAX_CHARS = 4000;

// MUST match audioHash() in script.js / generate-audio.js exactly.
export function audioHash(title: string, content: string): string {
  const str = title.toLowerCase().trim() + '::' + content.toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
}

// MUST match splitAtSentences() in generate-audio.js exactly.
function splitAtSentences(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.substring(0, maxChars);
    let splitAt = -1;
    for (let i = slice.length - 1; i > maxChars * 0.3; i--) {
      if ((slice[i] === '.' || slice[i] === '!' || slice[i] === '?') && (i + 1 >= slice.length || slice[i + 1] === ' ')) {
        splitAt = i + 1;
        break;
      }
    }
    if (splitAt === -1) {
      splitAt = slice.lastIndexOf(' ');
      if (splitAt === -1) splitAt = maxChars;
    }
    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }
  return chunks;
}

export interface AudioChunk {
  /** Storage path the lesson looks for, e.g. "weekly-audio/abc123.mp3". */
  storagePath: string;
  /** Human label for the editor (section name, with "(part N)" if split). */
  label: string;
  /** The narration text for this chunk. */
  text: string;
}

export interface AudioSection {
  /** Clean display name for the section (e.g. "The Concept"). */
  sectionName: string;
  /** One or more chunks (long sections split at sentence boundaries). */
  chunks: AudioChunk[];
}

const STORAGE_AUDIO_PREFIX = 'weekly-audio';

/** Extract the narrated sections (Concept, In Practice, bonus sections — NOT
 *  Practices/Info/Resources) from a lesson's HTML, with the exact content
 *  hashes the runtime uses. */
export function extractNarratedSections(html: string): AudioSection[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: AudioSection[] = [];
  doc.querySelectorAll('.section-card').forEach((card) => {
    // MUST match isNonNarratedSection() — these have no narrate button.
    if (card.id === 'info' || card.id === 'resources' || card.id === 'practices') return;
    const header = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    if (!header || !content) return;

    // The HASH must use the raw header text (matches generate-audio.js /
    // getSectionAudioPath: headerEl.textContent.trim()).
    const hashTitle = (header.textContent || '').trim();
    // The DISPLAY name strips the trailing accordion chevron for readability.
    const sectionName = (header.querySelector('h2')?.textContent || hashTitle)
      .replace(/[▲▼]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const clone = content.cloneNode(true) as Element;
    clone.querySelectorAll(AUDIO_STRIP_SELECTORS).forEach((el) => el.remove());
    const fullText = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (!fullText) return;

    const hash = audioHash(hashTitle, fullText);
    const parts = splitAtSentences(fullText, MAX_CHARS);

    const chunks: AudioChunk[] =
      parts.length === 1
        ? [{ storagePath: `${STORAGE_AUDIO_PREFIX}/${hash}.mp3`, label: sectionName, text: parts[0] }]
        : parts.map((chunk, i) => ({
            storagePath: `${STORAGE_AUDIO_PREFIX}/${hash}_part${i + 1}.mp3`,
            label: `${sectionName} (part ${i + 1})`,
            text: chunk,
          }));

    out.push({ sectionName, chunks });
  });
  return out;
}
