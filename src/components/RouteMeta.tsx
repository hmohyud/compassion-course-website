import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Sets a per-page <title> + meta description (and matching OpenGraph/Twitter
 * tags + canonical link) on each route change. Purely client-side — it changes
 * nothing a visitor sees in the page body; it only improves the browser tab
 * title and what crawlers that DO run JS (e.g. Googlebot) read per page.
 *
 * Safe by design:
 *  - Only the public marketing routes get custom labels; other routes fall back
 *    to the site default.
 *  - The weekly lesson viewer (/weekly/:n) manages its own document.title, so
 *    this component deliberately leaves that path alone.
 */

const ORIGIN = 'https://compassioncourse.org'

const DEFAULT = {
  title: 'The Compassion Course',
  description: 'A year of practicing compassion, one week at a time.',
}

const META: Record<string, { title: string; description: string }> = {
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
  '/programs': {
    title: 'Programs — The Compassion Course',
    description:
      'Explore the programs of The Compassion Course, including the year-long online course and the optional Certificate of Completion (COC) track.',
  },
  '/learn-more': {
    title: 'Learn More — The Compassion Course',
    description:
      'How The Compassion Course works: what you practice each week, the community, and how to join this year’s global cohort.',
  },
  '/compass-companion': {
    title: 'Compass Companions — The Compassion Course',
    description:
      'Meet the Compass Companions who help guide and support participants through The Compassion Course.',
  },
  '/contact': {
    title: 'Contact — The Compassion Course',
    description:
      'Contact The Compassion Course team with questions about enrollment, the course, or the Global Compassion Network.',
  },
}

function setMeta(selector: string, attr: string, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

export default function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Leave the weekly lesson viewer's own title handling untouched.
    if (/^\/weekly\/[^/]+/.test(pathname)) return

    const m = META[pathname] || DEFAULT
    document.title = m.title
    setMeta('meta[name="description"]', 'name', 'description', m.description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', m.title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', m.description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', ORIGIN + pathname)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', m.title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', m.description)
    setCanonical(ORIGIN + (pathname === '/' ? '/' : pathname))
  }, [pathname])

  return null
}
