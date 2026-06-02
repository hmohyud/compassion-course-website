/**
 * Format a YYYY-MM-DD calendar date as a verbal string like "June 24".
 *
 * The course's release dates are stored as ISO calendar dates (no time
 * component) and refer to a moment in Eastern time. Displaying the raw
 * `2026-06-24` form is unambiguous, but ugly; the localized `6/24/2026`
 * form is ambiguous (Americans read it as June 24, Europeans as 6
 * January 1976 if mistyped). Spelling the month out sidesteps both
 * problems and stays correct for every reader.
 *
 * The weekday is intentionally omitted — every weekly lesson releases on
 * a Wednesday, so a "Wed," prefix is redundant noise on the Lesson
 * Library. The year is omitted too — all 52 releases land in the same
 * cohort year and the page context already makes the year obvious. If we
 * ever publish across calendar years we can pass `{ year: 'numeric' }`.
 */
export function formatReleaseDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Tolerate values that aren't strict YYYY-MM-DD by passing them through
  // unchanged; the admin form trusts the date input, so this should never
  // hit in practice.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct in UTC and format in UTC so a US user near midnight and a
  // European user mid-morning both see the same calendar day — the date
  // string is a wall-clock date, not a moment in time.
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
