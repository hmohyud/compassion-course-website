// Personalized greeting generator for the Member Portal landing.
//
// Combines the four signals we MAY have on a member — name, city,
// state/country, and the visitor's local time-of-day — into a single
// sentence. The rule the user asked for is:
//   - only fill in fields we actually have
//   - time-of-day phrasing kicks in only when we have a location
//     (since the visitor's clock represents the location they're in)
//   - several variants for variety; one is picked at random

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

function firstName(full?: string): string {
  return (full || '').trim().split(/\s+/)[0] || '';
}

/** Best location label we have — prefer city, fall back to state, then country. */
function bestPlace(g: GreetingInput): string {
  return (g.city || g.state || g.country || '').trim();
}

/**
 * Build a single greeting line. Picks one variant randomly from the set
 * appropriate to the data on hand. Always returns a non-empty string.
 */
export function buildGreeting(input: GreetingInput): string {
  const name = firstName(input.name);
  const place = bestPlace(input);
  const tod = timeOfDay(input.now || new Date());
  // "night" sounds odd when paired with "Good _" — Anglo convention prefers
  // "Good evening" past sundown. Reserve a separate "late-night" voice.
  const goodWord = tod === 'night' ? 'evening' : tod;

  const hasName = !!name;
  const hasPlace = !!place;

  let variants: string[] = [];

  if (hasName && hasPlace) {
    variants = [
      `Good ${goodWord}, ${name}! Hope your ${tod} in ${place} is treating you well.`,
      `Hi ${name} — sending warm thoughts from us to ${place}.`,
      `Good ${goodWord} from ${place}, ${name}.`,
      `Welcome back, ${name}. Hope your ${tod} in ${place} is off to a kind start.`,
      `Hello ${name}! Hope all's well over in ${place}.`,
      `Glad you're here, ${name}. May your ${tod} in ${place} be gentle.`,
    ];
  } else if (hasName) {
    variants = [
      `Hope you're having a good day, ${name}.`,
      `Welcome, ${name}.`,
      `Glad to see you, ${name}.`,
      `Hello again, ${name}.`,
      `Hi ${name} — thanks for being here.`,
      `Welcome back, ${name}.`,
    ];
  } else if (hasPlace) {
    variants = [
      `Good ${goodWord} from ${place}!`,
      `Hope your ${tod} in ${place} is going well.`,
      `Welcome from ${place}.`,
      `Sending warmth toward ${place} — hope your ${tod} is gentle.`,
      `Hi there in ${place} — glad you're here.`,
    ];
  } else {
    variants = [
      `Welcome to the 2026 Member Portal.`,
      `Glad you're here.`,
      `Welcome back.`,
      `Welcome — thanks for being part of this.`,
      `Hello, and welcome.`,
    ];
  }

  return variants[Math.floor(Math.random() * variants.length)];
}
