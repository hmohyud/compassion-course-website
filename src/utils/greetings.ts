// Personalized greeting generator for the Member Portal landing.
//
// Combines the four signals we MAY have on a member — name, city,
// state/country, and the visitor's local time-of-day — into one
// short, casual sentence. Rules:
//   - only fill in fields we actually have
//   - time-of-day phrasing kicks in only when we have a location
//   - several variants for variety; one is picked at random
//   - keep the tone light, not effusive (no "may your evening be gentle")
//   - Title-case the first name so registrations like "tho bon" or
//     "JOHN TUCKER" come out as "Tho" / "John"

export interface GreetingInput {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  /** Override "now" for tests; defaults to new Date(). */
  now?: Date;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstName(full?: string): string {
  const raw = (full || '').trim().split(/\s+/)[0] || '';
  return titleCase(raw);
}

/** Best location label we have — prefer city, fall back to state, then country. */
function bestPlace(g: GreetingInput): string {
  const raw = (g.city || g.state || g.country || '').trim();
  // Title-case "new york" → "New York", but leave already-uppercase
  // entries like "U.K." or "USA" alone (>50% uppercase). Heuristic:
  // if the string looks like an acronym/initialism, keep it.
  if (raw && raw.length > 1 && raw === raw.toUpperCase() && raw.length <= 4) {
    return raw;
  }
  return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a single greeting line. Picks one variant randomly from the set
 * appropriate to the data on hand. Always returns a non-empty string.
 */
export function buildGreeting(input: GreetingInput): string {
  const name = firstName(input.name);
  const place = bestPlace(input);
  const tod = timeOfDay(input.now || new Date());
  // "night" → "evening" since "Good night" reads as a farewell.
  const goodWord = tod === 'night' ? 'evening' : tod;

  const hasName = !!name;
  const hasPlace = !!place;

  let variants: string[] = [];

  if (hasName && hasPlace) {
    variants = [
      `Good ${goodWord}, ${name}.`,
      `Hi ${name} — good ${goodWord} from ${place}.`,
      `Welcome back, ${name}.`,
      `Hi ${name}.`,
      `Good ${goodWord} from ${place}, ${name}.`,
    ];
  } else if (hasName) {
    variants = [
      `Welcome, ${name}.`,
      `Hi ${name}.`,
      `Welcome back, ${name}.`,
      `Hello, ${name}.`,
    ];
  } else if (hasPlace) {
    variants = [
      `Good ${goodWord} from ${place}.`,
      `Welcome from ${place}.`,
      `Hi there in ${place}.`,
    ];
  } else {
    variants = [
      `Welcome.`,
      `Welcome back.`,
      `Hi there.`,
    ];
  }

  return variants[Math.floor(Math.random() * variants.length)];
}
