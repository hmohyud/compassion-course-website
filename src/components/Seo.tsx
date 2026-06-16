import { Head } from 'vite-react-ssg'

/**
 * Seo — bakes per-route <head> tags at prerender time (and updates them on
 * client navigation) via vite-react-ssg's <Head>. This replaces the old
 * client-only RouteMeta useEffect, which left every prerendered page with an
 * identical generic <title> and a canonical that always pointed at the
 * homepage (an SEO blocker the audit flagged).
 *
 * Each public page renders <Seo path="/..." /> and gets its title/description
 * from the shared META map below. Canonical + og:url are absolute and
 * self-referential (e.g. /about → https://compassioncourse.org/about), so each
 * page points at itself rather than the homepage.
 */

const ORIGIN = 'https://compassioncourse.org'

export const SEO_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'The Compassion Course — A Year of Practicing Compassion',
    description:
      'A year-long online course in compassionate, needs-based living and Nonviolent Communication (NVC) with Thom Bond. One practice at a time.',
  },
  '/about': {
    title: 'About — The Compassion Course',
    description:
      'About The Compassion Course: its approach to Nonviolent Communication and compassionate living, and instructor Thom Bond of the NY Center for Nonviolent Communication.',
  },
  '/learn-more': {
    title: 'Learn More — The Compassion Course',
    description:
      'How The Compassion Course works: what you practice each week, the community, and how to join this year’s global cohort.',
  },
  '/contact': {
    title: 'Contact — The Compassion Course',
    description:
      'Contact The Compassion Course team with questions about enrollment, the course, or the Global Compassion Network.',
  },
}

const DEFAULT = {
  title: 'The Compassion Course',
  description: 'A year of practicing compassion, one week at a time.',
}

interface SeoProps {
  /** Route path, e.g. "/about". Used to look up META and build the canonical. */
  path: string
  /** Optional explicit overrides (fall back to the META map for `path`). */
  title?: string
  description?: string
}

export default function Seo({ path, title, description }: SeoProps) {
  const meta = SEO_META[path] || DEFAULT
  const resolvedTitle = title ?? meta.title
  const resolvedDescription = description ?? meta.description
  // Homepage canonical keeps the trailing slash; other routes are clean.
  const canonical = ORIGIN + (path === '/' ? '/' : path)

  return (
    <Head>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
    </Head>
  )
}
