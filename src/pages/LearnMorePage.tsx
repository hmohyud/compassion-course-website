import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import JotformPopup from '../components/JotformPopup';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { siteContent } from '../data/siteContent';

// Iframe that embeds a self-contained sample weekly message HTML file.
// Since the file is same-origin (served from /samples/) we can:
//   1) hide the inner file's duplicated top-nav / footer / progress bar
//   2) auto-resize the iframe to its content's scrollHeight so there's no inner scrollbar
const SampleIframe: React.FC<{ src: string; title: string }> = ({ src, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(1400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;
    let clickHandler: ((e: Event) => void) | null = null;

    // Target element to measure — a wrapper that represents "actual content"
    // so the iframe's own chrome doesn't mess with height reporting.
    const getMeasureTarget = (doc: Document): HTMLElement | null =>
      doc.querySelector('.main-content') as HTMLElement | null;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;
        const target = getMeasureTarget(doc);
        // Measure real content height — NOT documentElement.scrollHeight.
        // The iframe's <html> stretches to the iframe's set height (min-height
        // behavior), so using it creates a one-way feedback loop where the
        // iframe only ever grows and never shrinks.
        // Prefer main-content's offsetTop + offsetHeight (reliable). Fall back
        // to body.scrollHeight which reflects content, not the iframe frame.
        const mainBottom = target ? target.offsetTop + target.offsetHeight : 0;
        const bodyScroll = doc.body.scrollHeight;
        const h = Math.max(mainBottom, bodyScroll);
        // No hard upper bound — iframe can grow arbitrarily tall when everything
        // is expanded. Lower bound guards against transient 0-values during load.
        if (h > 200) setHeight(h + 4);
      } catch { /* noop — same-origin should be fine */ }
    };

    // Apply preview-mode treatment: disable journaling, mark-completed, print
    // while keeping them visible so visitors can see the real weekly-message layout.
    // Audio narration stays enabled.
    const applyPreviewMode = (doc: Document) => {
      // Helper: inject a small "(disabled in preview)" text label after an element, once.
      const addDisabledLabel = (el: Element, text = 'Disabled in preview') => {
        if ((el.nextSibling as HTMLElement | null)?.classList?.contains('sample-preview-label')) return;
        const label = doc.createElement('small');
        label.className = 'sample-preview-label';
        label.setAttribute('aria-hidden', 'true');
        label.innerHTML = `<span class="sample-preview-label-dot">🔒</span>${text}`;
        el.parentNode?.insertBefore(label, el.nextSibling);
      };

      // 1) Journal textareas: readonly + placeholder-as-hint + lock icon overlay
      doc.querySelectorAll<HTMLTextAreaElement>('.journal-area').forEach((ta) => {
        ta.readOnly = true;
        ta.setAttribute('aria-disabled', 'true');
        ta.setAttribute('data-preview-disabled', 'journal');
        if (!ta.placeholder || !ta.placeholder.includes('Preview')) {
          ta.placeholder = '🔒 Journal disabled in preview — enrolled participants have a personal journal that autosaves between visits.';
        }
      });
      // 2) Mark-as-read buttons: disabled + tooltip + inline label
      doc.querySelectorAll<HTMLButtonElement>('.section-read-btn').forEach((btn) => {
        btn.setAttribute('disabled', 'disabled');
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('data-preview-disabled', 'mark-read');
        btn.title = 'Disabled in preview — enrolled participants can track their progress through the course';
        addDisabledLabel(btn);
      });
      // 3) Print button(s) in the TOC: disabled + inline label
      doc.querySelectorAll<HTMLButtonElement>('.toc-btn').forEach((btn) => {
        const txt = (btn.textContent || '').trim().toLowerCase();
        if (txt.startsWith('print')) {
          btn.setAttribute('disabled', 'disabled');
          btn.setAttribute('aria-disabled', 'true');
          btn.setAttribute('data-preview-disabled', 'print');
          btn.title = 'Disabled in preview — enrolled participants can print the full lesson';
          addDisabledLabel(btn);
        }
      });
    };

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Hide chrome that would duplicate what the outer site already has
        // and style the preview-mode banner + disabled-feature affordances.
        const style = doc.createElement('style');
        style.textContent = `
          .top-nav, .site-footer, #progress-bar, #back-to-top { display: none !important; }
          html, body { background: transparent !important; }
          body { padding: 0 !important; margin: 0 !important; }
          /* Scoped to only the hero inside the sample iframe (tagged via JS
             below with .sample-embedded-hero). Doesn't affect the outer site. */
          .hero.sample-embedded-hero { border-radius: 16px; margin: 0 !important; }
          .main-content { padding-top: 1.5rem !important; padding-bottom: 1.25rem !important; }

          /* Keep section titles from colliding with the absolutely-positioned
             narrate (audio) button. The button sits at right:4rem / 28px wide.
             We want titles to hug the button without excessive whitespace, so
             reserve just enough room (button width + small gap). min-width:0
             is needed so the flex child can actually shrink/wrap. */
          .accordion-header h2 {
            padding-right: 2.75rem !important;
            min-width: 0 !important;
            flex: 1 1 auto !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }
          @media (max-width: 540px) {
            .accordion-header h2 { padding-right: 2.25rem !important; }
            .section-narrate-btn { right: 2.75rem !important; }
          }

          /* Preview banner injected into the main-content wrapper */
          .sample-preview-banner {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            margin: 0 0 1.5rem;
            padding: 0.9rem 1.1rem;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(42,122,110,0.08), rgba(232,168,56,0.08));
            border: 1px solid rgba(42,122,110,0.25);
            color: var(--clr-text, #2d2d2d);
            font-size: 0.9rem;
            line-height: 1.5;
          }
          .sample-preview-banner-icon {
            flex-shrink: 0;
            width: 28px; height: 28px;
            border-radius: 50%;
            background: var(--clr-primary, #2a7a6e);
            color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700;
            font-size: 0.85rem;
            margin-top: 1px;
          }
          .sample-preview-banner strong { color: var(--clr-primary, #2a7a6e); }

          /* Disabled-feature visual: show element but make it clearly non-interactive */
          [data-preview-disabled] {
            opacity: 0.55;
            cursor: not-allowed !important;
            position: relative;
          }
          [data-preview-disabled]:hover { opacity: 0.65; }
          textarea[data-preview-disabled="journal"] {
            background: repeating-linear-gradient(
              -45deg,
              var(--clr-bg-card, #fff),
              var(--clr-bg-card, #fff) 12px,
              var(--clr-bg-alt, #f0ece4) 12px,
              var(--clr-bg-alt, #f0ece4) 24px
            ) !important;
            color: var(--clr-text-muted, #8a8a8a) !important;
            caret-color: transparent;
          }
          button[data-preview-disabled] { pointer-events: none; }

          /* Inline "(Disabled in preview)" label injected next to disabled buttons */
          .sample-preview-label {
            display: inline-flex;
            align-items: center;
            gap: 0.35em;
            margin-left: 0.6rem;
            padding: 0.12rem 0.55rem;
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: var(--clr-text-muted, #8a8a8a);
            background: var(--clr-bg-alt, #f0ece4);
            border: 1px dashed var(--clr-border, #e0dbd2);
            border-radius: 999px;
            white-space: nowrap;
            vertical-align: middle;
            line-height: 1.4;
            font-family: inherit;
          }
          .sample-preview-label-dot { font-size: 0.72em; line-height: 1; }
          /* Put the print-button label on its own line below the TOC-actions row */
          .toc-actions { flex-wrap: wrap; gap: 0.4rem 0.4rem; }
          .toc-actions .sample-preview-label { margin-left: 0; margin-top: 0.25rem; }

          /* Parent wrapper padlock badge for disabled journal */
          .practice-card { position: relative; }
          .practice-card:has(textarea[data-preview-disabled]) > .journal-footer,
          .practice-card:has(textarea[data-preview-disabled]) > .journal-saved {
            display: none !important;
          }
          .practice-card:has(textarea[data-preview-disabled])::after {
            content: '🔒 Journal disabled in preview';
            position: absolute;
            top: 0.8rem;
            right: 0.8rem;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 0.25rem 0.6rem;
            border-radius: 999px;
            background: var(--clr-bg-card, #fff);
            color: var(--clr-text-muted, #8a8a8a);
            border: 1px dashed var(--clr-border, #e0dbd2);
          }
        `;
        doc.head.appendChild(style);

        // Tag the hero so our injected CSS can target it narrowly (scoped to
         // inside this iframe only — no outer-site impact).
        doc.querySelector('.hero')?.classList.add('sample-embedded-hero');

        // Some dialogue containers in the bundle only have a single line (the
        // Friend's quote used as setup) — their Next/Reset controls are
        // vestigial and clicking Next does nothing visible. Hide those
        // controls so visitors don't mash a non-functional button.
        doc.querySelectorAll('.dialogue-container').forEach((container) => {
          const lineCount = container.querySelectorAll('.dialogue-line, .dialogue-narration').length;
          if (lineCount <= 1) {
            const controls = container.querySelector('.dialogue-controls') as HTMLElement | null;
            if (controls) controls.style.display = 'none';
          }
        });

        // Inject preview banner at the top of .main-content (once)
        const main = doc.querySelector('.main-content');
        if (main && !main.querySelector('.sample-preview-banner')) {
          const banner = doc.createElement('div');
          banner.className = 'sample-preview-banner';
          banner.setAttribute('role', 'note');
          banner.innerHTML = `
            <span class="sample-preview-banner-icon" aria-hidden="true">i</span>
            <span>
              <strong>Preview mode.</strong>
              You can read the lesson and play the audio narration.
              <em>Mark-completed</em>, <em>journaling</em>, and <em>print</em> are disabled here —
              enrolled participants get full access.
            </span>
          `;
          main.insertBefore(banner, main.firstChild);
        }

        // Apply disabled treatment to interactive features
        applyPreviewMode(doc);
        // Re-apply after the bundled script initializes (buttons are injected late)
        setTimeout(() => applyPreviewMode(doc), 300);
        setTimeout(() => applyPreviewMode(doc), 1200);

        // Initial measurement after the browser paints
        setTimeout(measure, 50);
        setTimeout(measure, 400);

        // Watch for content size changes on .main-content only (not body).
        // Watching body can create a feedback loop because the iframe's body
        // sizes itself to the iframe height.
        const target = getMeasureTarget(doc);
        if (target) {
          observer = new ResizeObserver(measure);
          observer.observe(target);
        }

        // Re-measure shortly after any click (accordion animations finish in ~500ms).
        // Also re-apply preview mode in case new buttons were injected by the bundle's JS.
        clickHandler = () => {
          setTimeout(() => { measure(); applyPreviewMode(doc); }, 100);
          setTimeout(() => { measure(); applyPreviewMode(doc); }, 600);
        };
        doc.addEventListener('click', clickHandler);
      } catch (err) {
        console.warn('Sample iframe setup failed:', err);
      }
    };

    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      if (observer) observer.disconnect();
      try {
        if (clickHandler && iframe.contentDocument) {
          iframe.contentDocument.removeEventListener('click', clickHandler);
        }
      } catch { /* noop */ }
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className="learn-sample-iframe"
      style={{ width: '100%', height: `${height}px`, border: 'none', display: 'block', overflow: 'hidden' }}
      allow="autoplay"
      scrolling="no"
      loading="lazy"
    />
  );
};
// FlipCard component for "What Makes This Different"
const FlipCard: React.FC<{
  icon: string;
  heading: string;
  text: string;
}> = ({ icon, heading, text }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className={`flip-card ${flipped ? 'flip-card--flipped' : ''}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <div className="flip-card-icon">
            <i className={icon}></i>
          </div>
          <h3>{heading}</h3>
          <span className="flip-card-hint">Click to reveal</span>
        </div>
        <div className="flip-card-back">
          <p>{text}</p>
          <span className="flip-card-back-label">Click to flip back</span>
        </div>
      </div>
    </div>
  );
};

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260544078267159';

const { learnMore } = siteContent;

const LearnMorePage: React.FC = () => {
  useScrollReveal();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <Layout>
      {/* Hero Section — with image background */}
      <section className="learn-hero">
        <img
          src="/images/different-friends-sunset.jpg"
          alt={learnMore.hero.imageAlt}
          className="learn-hero-bg"
        />
        <div className="learn-hero-overlay" />
        <div className="learn-hero-content">
          <div className="learn-hero-inner">
            <p className="learn-hero-eyebrow">{learnMore.hero.eyebrow}</p>
            <h1 className="learn-hero-heading">{learnMore.hero.heading}</h1>
            <p className="learn-hero-description">{learnMore.hero.description}</p>
            <div className="learn-hero-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={learnMore.hero.buttonPrimary}
              />
              <a href={learnMore.hero.buttonSecondaryHref} className="btn-secondary">
                {learnMore.hero.buttonSecondary}
              </a>
            </div>
          </div>
          <div className="learn-stats-grid">
            {learnMore.hero.stats.map((stat) => (
              <div key={stat.label} className="learn-stat-card">
                <div className="learn-stat-number">{stat.number}</div>
                <div className="learn-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Origin Story — timeline + image */}
      <section className="learn-origin reveal">
        <div className="container">
          <h2 className="section-title">{learnMore.origin.title}</h2>
          <div className="learn-origin-inner">
            <div className="learn-origin-image">
              <video controls preload="none" poster="/images/origin-conversation.jpg">
                <source src={learnMore.origin.videoSrc} type="video/mp4" />
              </video>
            </div>
            <div className="learn-origin-timeline">
              {learnMore.origin.timeline.map((item) => (
                <div key={item.year} className="learn-origin-year">
                  <span className="learn-origin-year-num">{item.year}</span>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="learn-how reveal">
        <div className="container">
          <div className="learn-how-intro">
            <div className="learn-how-intro-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>{learnMore.howItWorks.title}</h2>
              <p className="section-description" style={{ textAlign: 'left', maxWidth: 'none' }}>
                {learnMore.howItWorks.description}
              </p>
            </div>
            <div className="learn-how-intro-image">
              <img
                src="/images/how-friends-laughing.jpg"
                alt={learnMore.howItWorks.imageAlt}
                loading="lazy"
              />
            </div>
          </div>

          <div className="learn-how-steps">
            {learnMore.howItWorks.steps.map((step, i) => (
              <div
                key={step.number}
                className={`beam-wrap reveal-bounce reveal-delay-${(i % 4) + 1}`}
              >
                <div className="beam-border" />
                <div className="beam-inner learn-how-step-card">
                  <div className="learn-how-step-number">{step.number}</div>
                  <div className="learn-how-step-icon">
                    <i className={step.icon}></i>
                  </div>
                  <h3>{step.heading}</h3>
                  <p>{step.text}</p>
                  {'concepts' in step && (
                    <div className="learn-concepts-grid">
                      {(step as any).concepts.map((concept: { icon: string; label: string }) => (
                        <div key={concept.label} className="learn-concept-tag">
                          <i className={concept.icon}></i>
                          <span>{concept.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {'bullets' in step && (
                    <ul className="learn-step-bullets">
                      {(step as any).bullets.map((b: string) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {'outcomeHeading' in step && (
                    <>
                      <p className="learn-step-outcome-heading">{(step as any).outcomeHeading}</p>
                      <ul className="learn-step-outcomes">
                        {(step as any).outcomes.map((o: string) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Strip — community & kindness imagery */}
      <section className="learn-photo-strip">
        <div className="learn-photo-strip-inner">
          {learnMore.photoStrip.images.map((img) => (
            <div key={img.src} className="learn-photo-strip-item">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* A Peek Inside the Course */}
      <section id="peek-inside" className="learn-peek reveal">
        <div className="container">
          <div className="learn-peek-header">
            <div className="learn-peek-header-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>{learnMore.peekInside.title}</h2>
              <p className="section-description" style={{ textAlign: 'left', maxWidth: 'none' }}>
                {learnMore.peekInside.description}
              </p>
            </div>
            <div className="learn-peek-header-image">
              <img
                src="/images/peek-reflection.jpg"
                alt={learnMore.peekInside.imageAlt}
                loading="lazy"
              />
            </div>
          </div>
          <div className="learn-peek-columns">
            <div className="learn-peek-col">
              <h3 className="learn-peek-col-title">{learnMore.peekInside.col1Title}</h3>
              <div className="learn-peek-list">
                {learnMore.peekInside.weeklyTopics.map((topic) => (
                  <div key={topic.week} className="learn-peek-item">
                    <span className="learn-peek-week">{topic.week}</span>
                    <span className="learn-peek-title">{topic.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="learn-peek-col">
              <h3 className="learn-peek-col-title">{learnMore.peekInside.col2Title}</h3>
              <div className="learn-peek-topic-tags">
                {learnMore.peekInside.topicTags.map((tag) => (
                  <span key={tag} className="learn-peek-tag">{tag}</span>
                ))}
              </div>
              <p className="learn-peek-more">{learnMore.peekInside.moreText}</p>
              <div className="learn-peek-sample-links">
                {learnMore.peekInside.sampleLinks.map((link) => (
                  <a key={link.href} href={link.href} className="learn-peek-sample-link">
                    <i className={link.icon}></i> {link.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Week 10 — Empathy */}
      <section id="sample-empathy" className="learn-sample reveal">
        <div className="container">
          <div className="learn-sample-header">
            <span className="learn-sample-badge">{learnMore.sampleEmpathy.badge}</span>
            <h2 className="section-title">{learnMore.sampleEmpathy.title}</h2>
            <p className="learn-sample-intro">
              A preview of the full weekly message — expand sections, play the audio narration,
              and try the practice journal.
            </p>
          </div>
          <div className="learn-sample-iframe-wrap">
            <SampleIframe
              src="/samples/week10.html"
              title="Sample Week 10: What Empathy Is... and What It's Not"
            />
          </div>
        </div>
      </section>

      {/* Sample Week 22 — Appreciation */}
      <section id="sample-appreciation" className="learn-sample learn-sample--alt reveal">
        <div className="container">
          <div className="learn-sample-header">
            <span className="learn-sample-badge learn-sample-badge--alt">{learnMore.sampleAppreciation.badge}</span>
            <h2 className="section-title">{learnMore.sampleAppreciation.title}</h2>
            <p className="learn-sample-intro">
              A preview of the full weekly message — expand sections, play the audio narration,
              and try the practice journal.
            </p>
          </div>
          <div className="learn-sample-iframe-wrap">
            <SampleIframe
              src="/samples/week22.html"
              title="Sample Week 22: The Power of Thanks — More About Appreciation"
            />
          </div>
        </div>
      </section>

      {/* What Makes This Different */}
      <section id="what-makes-different" className="learn-different reveal">
        <div className="container">
          <h2 className="section-title">{learnMore.whatMakesDifferent.heading}</h2>
          <p className="section-description">{learnMore.whatMakesDifferent.subtitle}</p>
          <div className="learn-different-video">
            <video controls preload="none" poster="/images/hero-community.jpg">
              <source src={learnMore.whatMakesDifferent.videoSrc} type="video/mp4" />
            </video>
          </div>
          <div className="learn-different-flip-grid">
            {learnMore.whatMakesDifferent.cards.map((card) => (
              <FlipCard
                key={card.heading}
                icon={card.icon}
                heading={card.heading}
                text={card.text}
              />
            ))}
          </div>

        </div>
      </section>

      {/* Options & Extras */}
      <section id="options-extras" className="learn-options reveal">
        <div className="container">
          <h2 className="section-title">{learnMore.optionsExtras.title}</h2>
          <p className="section-description">{learnMore.optionsExtras.description}</p>
          <div className="learn-options-list">
            {learnMore.optionsExtras.items.map((item, i) => (
              <div key={item.heading} className={`learn-options-item reveal-bounce reveal-delay-${(i % 4) + 1}`}>
                <div className="learn-options-item-icon">
                  <i className={item.icon}></i>
                </div>
                <div className="learn-options-item-body">
                  <h3>{item.heading}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Leadership Track */}
      <section id="leadership-track" className="learn-leadership reveal">
        <div className="container">
          <div className="learn-leadership-header">
            <div className="learn-leadership-icon">
              <i className="fas fa-award"></i>
            </div>
            <h2 className="section-title">{learnMore.leadershipTrack.title}</h2>
            <p className="section-description">{learnMore.leadershipTrack.description}</p>
          </div>

          <div className="learn-leadership-grid">
            {/* Monthly meetings card */}
            <div className="learn-leadership-card">
              <div className="learn-leadership-card-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <h3>{learnMore.leadershipTrack.monthlyMeetings.heading}</h3>
              <p>{learnMore.leadershipTrack.monthlyMeetings.description}</p>
              <ul className="learn-leadership-list">
                {learnMore.leadershipTrack.monthlyMeetings.items.map((item, i) => (
                  <li key={i}>
                    <i className="fas fa-check"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community & Support card */}
            <div className="learn-leadership-card">
              <div className="learn-leadership-card-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>{learnMore.leadershipTrack.communitySupport.heading}</h3>
              <ul className="learn-leadership-list learn-leadership-list--spaced">
                {learnMore.leadershipTrack.communitySupport.items.map((item, i) => (
                  <li key={i}>
                    <i className="fas fa-check"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Callout */}
          <div className="learn-leadership-callout">
            <i className="fas fa-heart"></i>
            <p>{learnMore.leadershipTrack.callout}</p>
          </div>

          {/* Requirements & Tuition */}
          <div className="learn-leadership-details">
            <div className="learn-leadership-detail">
              <h4><i className="fas fa-clipboard-check"></i> {learnMore.leadershipTrack.requirements.heading}</h4>
              <p>{learnMore.leadershipTrack.requirements.facilitator}</p>
              <p>{learnMore.leadershipTrack.requirements.mentor}</p>
            </div>
            <div className="learn-leadership-detail learn-leadership-detail--tuition">
              <h4><i className="fas fa-tag"></i> Tuition</h4>
              <p>{learnMore.leadershipTrack.tuition}</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Thom Bond — with photo */}
      <section id="about-thom" className="learn-founder reveal">
        <div className="container">
          <div className="learn-founder-inner">
            <div className="learn-founder-photo-side">
              <div className="learn-founder-photo-wrapper">
                <img
                  src="/Team/ThomBond.png"
                  alt={learnMore.founder.imageAlt}
                  className="learn-founder-photo"
                  loading="lazy"
                />
              </div>
              <div className="learn-founder-quote-card">
                <div className="learn-founder-quote-mark">&ldquo;</div>
                <p className="learn-founder-quote-text">{learnMore.founder.quote}</p>
                <span className="learn-founder-quote-attr">{learnMore.founder.quoteAttribution}</span>
              </div>
            </div>
            <div className="learn-founder-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>{learnMore.founder.title}</h2>
              {learnMore.founder.bio.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="learn-faq reveal">
        <div className="container">
          <h2 className="section-title">{learnMore.faq.title}</h2>
          <div className="learn-faq-list">
            {learnMore.faq.items.map((faq, index) => (
              <div
                key={index}
                className={`learn-faq-item ${openFaq === index ? 'learn-faq-item--open' : ''}`}
              >
                <button
                  type="button"
                  className="learn-faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                >
                  <span>{faq.question}</span>
                  <i className={`fas fa-chevron-down learn-faq-chevron ${openFaq === index ? 'learn-faq-chevron--open' : ''}`}></i>
                </button>
                <div
                  className="learn-faq-answer"
                  style={{
                    maxHeight: openFaq === index ? '300px' : '0',
                    opacity: openFaq === index ? 1 : 0,
                  }}
                >
                  <p>
                    {faq.answer}
                    {(faq as any).linkText && (faq as any).linkUrl && (
                      <>{' '}<a href={(faq as any).linkUrl} target="_blank" rel="noopener noreferrer" className="learn-faq-link">{(faq as any).linkText}</a></>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta reveal">
        <div className="container">
          <div className="cta-content">
            <h2>{learnMore.cta.heading}</h2>
            <p>{learnMore.cta.text}</p>
            <div className="cta-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={learnMore.cta.buttonPrimary}
              />
              <Link to={learnMore.cta.linkHref} className="btn-secondary">
                {learnMore.cta.linkText}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LearnMorePage;
