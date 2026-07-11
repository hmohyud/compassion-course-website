import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import VideoPlayer from '../components/VideoPlayer';
import Globe from '../components/Globe';
import StarrySky from '../components/StarrySky';
import JotformPopup from '../components/JotformPopup';
import { useContent } from '../context/ContentContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUpStats } from '../hooks/useInteractiveEffects';
import { siteContent } from '../data/siteContent';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '261905076159058';

const { home, shared } = siteContent;

// Calendar link generators (with reminders)
function makeGoogleCalUrl(title: string, date: string, description: string) {
  const d = date.replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${d}/${d}&details=${encodeURIComponent(description)}&add=DISPLAY:1440`;
}
function makeOutlookCalUrl(title: string, date: string, description: string) {
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${date}&enddt=${date}&body=${encodeURIComponent(description)}&rru=addevent`;
}
function makeIcsDataUrl(title: string, date: string, description: string) {
  const d = date.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d}`,
    `SUMMARY:${title}`, `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

// Timeline dates and phase logic
const JOURNEY = {
  regOpen: new Date('2026-03-01').getTime(),
  courseStart: new Date('2026-06-24').getTime(),
  regClose: new Date('2026-07-08').getTime(),
  courseEnd: new Date('2027-06-23').getTime(), // 52 weeks
};

type JourneyPhase = 'before' | 'registration' | 'in-progress' | 'late-reg' | 'closed' | 'completed';

function getJourneyInfo(dateMs: number) {
  let phase: JourneyPhase;
  let progress: number;

  // Visual mapping: regOpen = 0%, courseStart = 50%, regClose = 100%
  // Progress is mapped to visual positions so the dot aligns with milestones
  if (dateMs < JOURNEY.regOpen) {
    phase = 'before';
    progress = 0;
  } else if (dateMs < JOURNEY.courseStart) {
    phase = 'registration';
    // Map March 1 → June 24 to 0% → 50%
    const segFrac = (dateMs - JOURNEY.regOpen) / (JOURNEY.courseStart - JOURNEY.regOpen);
    progress = Math.round(segFrac * 50);
  } else if (dateMs < JOURNEY.regClose) {
    phase = 'late-reg'; // course started but registration still open
    // Map June 24 → July 8 to 50% → 100%
    const segFrac = (dateMs - JOURNEY.courseStart) / (JOURNEY.regClose - JOURNEY.courseStart);
    progress = Math.round(50 + segFrac * 50);
  } else if (dateMs < JOURNEY.courseEnd) {
    phase = 'in-progress';
    progress = 100;
  } else {
    phase = 'completed';
    progress = 100;
  }
  return { phase, progress: Math.min(100, Math.max(0, progress)) };
}

const HomePage: React.FC = () => {
  const { getContent } = useContent();
  const chatbotContainerRef = useRef<HTMLDivElement>(null);
  const heroLogoRef = useRef<HTMLImageElement>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  // The journey block is time-dependent. During SSR (the static prerender) and
  // the very first client render we must NOT compute a phase from the build
  // clock — that would bake a frozen "Registration is open / 47%" into the
  // static HTML. We render a neutral, stable version until mount, then compute
  // the live phase. `mounted` starts false on both server and client so the
  // first client render matches the server markup (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Live, time-derived phase/progress — only meaningful after mount. Before
  // mount we render a neutral, stable baseline (the pre-registration view:
  // 0% progress, no "you are here" marker, no phase-specific "open now" text)
  // so the prerendered HTML is never frozen to the build date.
  const liveJourney = getJourneyInfo(Date.now());
  const journeyPhase: JourneyPhase = mounted ? liveJourney.phase : 'before';
  const journeyProgress = mounted ? liveJourney.progress : 0;
  const { containerRef: statsRef, displayValues: statValues, finalValues: statFinals } = useCountUpStats(
    home.peaceEducation.stats.map((s) => s.number),
    2200
  );

  useScrollReveal();

  // Tilt handler for cards
  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    card.style.transform = `perspective(800px) rotateX(${(y - 0.5) * -12}deg) rotateY(${(x - 0.5) * 12}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);
  const handleTiltLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  }, []);

  // Observe hero logo visibility and dispatch event for Navigation
  useEffect(() => {
    const el = heroLogoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(
          new CustomEvent('hero-logo-visibility', {
            detail: { visible: entry.isIntersecting },
          })
        );
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % home.socialProof.testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ElevenLabs AI agent — floating chat bubble
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (existingScript || !chatbotContainerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-elevenlabs-chatbot', 'true');
    script.onload = () => {
      if (chatbotContainerRef.current) {
        chatbotContainerRef.current.innerHTML = '';
        const chatbotElement = document.createElement('elevenlabs-convai');
        chatbotElement.setAttribute('agent-id', 'agent_0301kaf26r60eqkr3x8qe2v8wdq0');
        chatbotContainerRef.current.appendChild(chatbotElement);
      }
    };
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (scriptToRemove) scriptToRemove.remove();
      if (chatbotContainerRef.current) chatbotContainerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <Layout>
      <Seo path="/" />
      {/* Hero Section — Globe + Title */}
      <section className="hero">
        <StarrySky />
        <div className="hero-grid">
          <div className="hero-text">
            <p className="hero-eyebrow">
              {getContent('hero', 'subtitle', home.hero.eyebrowDefault)}
            </p>
            <div className="hero-brand">
              <img
                ref={heroLogoRef}
                src="/logo_heart.png"
                alt={home.hero.logoAlt}
                className="hero-logo"
              />
              <div className="hero-brand-text">
                <h1 className="hero-heading">{home.hero.heading.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    {word}
                    {word === 'Online' && <sup className="hero-tm" aria-hidden="true">TM</sup>}
                  </React.Fragment>
                ))}</h1>
                <span id="hero-subtitle">{home.hero.subtitlePrefix} <a href={home.hero.subtitleUrl}>{home.hero.subtitleName}</a></span>
              </div>
            </div>
            <p className="hero-description">
              {getContent('hero-stats', 'stat1-description', home.hero.descriptionDefault)}
            </p>
            <div className="hero-buttons">
              <Link to={home.hero.ctaPrimaryLink} className="btn-primary">
                {getContent('hero', 'ctaPrimary', home.hero.ctaPrimaryDefault)}
              </Link>
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={getContent('hero', 'ctaSecondary', home.hero.ctaSecondaryDefault)}
              />
            </div>
          </div>
          <div className="hero-globe">
            <Globe />
            <p className="hero-globe-hint">
              <i className="fas fa-hand-pointer"></i> Drag to explore our global community
            </p>
          </div>
        </div>
      </section>

      {/* Your Journey Timeline */}
      <section className="home-journey reveal">
        <div className="container">
          <h2 className="home-journey-heading">
            {journeyPhase === 'in-progress' || journeyPhase === 'late-reg'
              ? 'The Journey Has Begun'
              : journeyPhase === 'completed'
              ? 'Thank You for an Incredible Year'
              : 'Your Compassion Journey'}
          </h2>
          <p className="home-journey-status">
            {journeyPhase === 'before' && 'Registration opens March 1, 2026. Mark your calendar!'}
            {journeyPhase === 'registration' && 'Registration is open now \u2014 secure your spot before the journey begins June 24th.'}
            {journeyPhase === 'late-reg' && 'The course has started \u2014 but you can still join! Registration closes July 8th.'}
            {journeyPhase === 'in-progress' && 'The 52-week Compassion Course is currently underway.'}
            {journeyPhase === 'completed' && 'The 2026 Compassion Course has concluded. Stay tuned for the next session!'}
          </p>

          {/* Phase: completed — simple message, no timeline */}
          {journeyPhase === 'completed' ? (
            <div className="home-journey-completed">
              <div className="home-journey-dot home-journey-dot--primary" style={{ margin: '0 auto 16px' }}>
                <i className="fas fa-heart"></i>
              </div>
              <p>The 2026 Compassion Course has concluded. Stay tuned for the next session!</p>
            </div>
          ) : (
            <>

              <div className="home-journey-timeline">
                {/* Progress track */}
                <div className="home-journey-track">
                  <div className="home-journey-track-fill" style={{ width: `${journeyProgress}%` }}></div>
                </div>
                {/* "You are here" dot — visible during registration and late-reg phases */}
                {journeyProgress > 3 && journeyProgress < 97 && (journeyPhase === 'registration' || journeyPhase === 'late-reg') && (
                  <div className="home-journey-here-track" style={{ left: 'calc(100% / 6)', right: 'calc(100% / 6)', top: '20px' }}>
                    <div className="home-journey-here" style={{ left: `${journeyProgress}%` }}>
                      <div className="home-journey-here-dot"></div>
                    </div>
                  </div>
                )}

                {/* Milestones — chronological: March 1 → June 24 → July 8 */}
                <div className="home-journey-milestones">
                  {/* 1. Registration Opens — March 1 */}
                  <div className={`home-journey-milestone ${journeyPhase !== 'before' ? 'home-journey-milestone--done' : ''}`}>
                    <div className={`home-journey-dot ${journeyPhase !== 'before' ? 'home-journey-dot--done' : ''}`}>
                      {journeyPhase !== 'before' ? <i className="fas fa-check"></i> : <i className="fas fa-door-open"></i>}
                    </div>
                    <div className="home-journey-content">
                      <span className="home-journey-date">March 1</span>
                      <span className="home-journey-event">
                        {journeyPhase === 'before' ? 'Registration Opens' : 'Registration Open'}
                      </span>
                      {journeyPhase !== 'before' && journeyPhase !== 'in-progress' && journeyPhase !== 'closed' && journeyPhase !== 'completed' && (
                        <div className="home-journey-register-wrap">
                          <div className="beam-border"></div>
                          <JotformPopup
                            formId={JOTFORM_FORM_ID}
                            buttonText="Register Now"
                            className="home-journey-register-btn"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Course Begins — June 24 */}
                  <div className="home-journey-milestone home-journey-milestone--destination">
                    <div className={`home-journey-dot ${journeyPhase === 'in-progress' || journeyPhase === 'late-reg' || journeyPhase === 'closed' ? 'home-journey-dot--done' : 'home-journey-dot--primary'}`}>
                      {journeyPhase === 'in-progress' || journeyPhase === 'late-reg' || journeyPhase === 'closed'
                        ? <i className="fas fa-check"></i>
                        : <i className="fas fa-heart"></i>}
                    </div>
                    <div className="home-journey-content">
                      <span className="home-journey-date">{home.keyDetails.startDate.value}</span>
                      <span className="home-journey-event">
                        {journeyPhase === 'in-progress' || journeyPhase === 'late-reg' ? 'Journey Underway' : 'Journey Begins'}
                      </span>
                      {journeyPhase === 'before' || journeyPhase === 'registration' ? (
                        <div className="home-key-details-cal">
                          <i className="fas fa-bell"></i> Remind Me
                          <div className="home-key-details-cal-dropdown"><div className="home-key-details-cal-dropdown-inner">
                            <a href={makeGoogleCalUrl(home.keyDetails.startDate.calendarEvent.title, home.keyDetails.startDate.calendarEvent.date, home.keyDetails.startDate.calendarEvent.description)} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-google"></i> Google Calendar
                            </a>
                            <a href={makeOutlookCalUrl(home.keyDetails.startDate.calendarEvent.title, home.keyDetails.startDate.calendarEvent.date, home.keyDetails.startDate.calendarEvent.description)} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-microsoft"></i> Outlook
                            </a>
                            <a href={makeIcsDataUrl(home.keyDetails.startDate.calendarEvent.title, home.keyDetails.startDate.calendarEvent.date, home.keyDetails.startDate.calendarEvent.description)} download="compassion-course-start.ics">
                              <i className="fab fa-apple"></i> Apple Calendar
                            </a>
                          </div></div>
                        </div>
                      ) : null}
                      <div className="home-journey-arrow">
                        <span>52 weeks <i className="fas fa-arrow-right"></i></span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Registration Closes — July 8 */}
                  <div className="home-journey-milestone">
                    <div className={`home-journey-dot ${journeyPhase === 'in-progress' || journeyPhase === 'closed' ? 'home-journey-dot--done' : 'home-journey-dot--warn'}`}>
                      {journeyPhase === 'in-progress' || journeyPhase === 'closed'
                        ? <i className="fas fa-check"></i>
                        : <i className="fas fa-hourglass-half"></i>}
                    </div>
                    <div className="home-journey-content">
                      <span className="home-journey-date">July 8</span>
                      <span className="home-journey-event">
                        {journeyPhase === 'in-progress' || journeyPhase === 'closed' ? 'Registration Closed' : 'Last Chance to Join'}
                      </span>
                      {journeyPhase !== 'in-progress' && journeyPhase !== 'closed' && (
                        <div className="home-key-details-cal">
                          <i className="fas fa-bell"></i> Remind Me
                          <div className="home-key-details-cal-dropdown"><div className="home-key-details-cal-dropdown-inner">
                            <a href={makeGoogleCalUrl(home.keyDetails.registration.calendarEvent.title, home.keyDetails.registration.calendarEvent.date, home.keyDetails.registration.calendarEvent.description)} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-google"></i> Google Calendar
                            </a>
                            <a href={makeOutlookCalUrl(home.keyDetails.registration.calendarEvent.title, home.keyDetails.registration.calendarEvent.date, home.keyDetails.registration.calendarEvent.description)} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-microsoft"></i> Outlook
                            </a>
                            <a href={makeIcsDataUrl(home.keyDetails.registration.calendarEvent.title, home.keyDetails.registration.calendarEvent.date, home.keyDetails.registration.calendarEvent.description)} download="compassion-course-deadline.ics">
                              <i className="fab fa-apple"></i> Apple Calendar
                            </a>
                          </div></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tuition badge — hide when completed */}
          {journeyPhase !== 'completed' && journeyPhase !== 'in-progress' && (
            <div className="home-journey-tuition">
              <span className="home-journey-tuition-label">Tuition:</span>
              <span className="home-journey-tuition-price">{home.keyDetails.tuition.value}</span>
              <span className="home-journey-tuition-reduced">
                {home.keyDetails.tuition.subtext}
                <span className="home-key-details-info-wrap">
                  <i className="fas fa-info-circle home-key-details-info-icon"></i>
                  <span className="home-key-details-tooltip">{home.keyDetails.tuition.tooltip}</span>
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Why Peace Education Matters */}
      <section className="home-impact reveal">
        <div className="container">
          <h2 className="section-title">{home.peaceEducation.title}</h2>
          <div className="home-impact-content">
            <div className="home-impact-text">
              <h3 className="home-impact-subhead">{home.peaceEducation.subhead1}</h3>
              <p>{home.peaceEducation.para1}</p>
              <h3 className="home-impact-subhead">{home.peaceEducation.subhead2}</h3>
              <p>{home.peaceEducation.para2}</p>
            </div>
            <div className="home-impact-video">
              <VideoPlayer src={home.peaceEducation.videoSrc} poster="/images/how-it-works-video.jpg" />
            </div>
          </div>
          <div className="home-impact-stats" ref={statsRef}>
            {home.peaceEducation.stats.map((stat, i) => (
              <div key={stat.label} className="home-impact-stat">
                <div className="home-impact-stat-number">
                  <span className="home-impact-stat-ghost" aria-hidden="true">{statFinals[i]}</span>
                  <span className="home-impact-stat-value">{statValues[i]}</span>
                </div>
                <div className="home-impact-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Video — Community Speaks */}
      <section className="home-featured-video reveal">
        <div className="container">
          <h2 className="section-title">{home.whatYoullLearn.title}</h2>
          <div className="home-featured-video-inner">
            <div className="home-featured-video-outcomes">
              {home.whatYoullLearn.outcomes.map((outcome) => (
                <div key={outcome} className="home-outcomes-item reveal">
                  <i className="fas fa-check-circle home-outcomes-icon"></i>
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sample the Course */}
      <section className="home-sample reveal">
        <div className="container">
          <h2 className="section-title">{home.sampleTheCourse.title}</h2>
          <p className="section-description">{home.sampleTheCourse.description}</p>
          <div className="home-sample-grid">
            {home.sampleTheCourse.weeks.map((sample, i) => (
              <div key={sample.week} className={`beam-wrap reveal-bounce reveal-delay-${i + 1}`}>
                <div className="beam-border" />
                <div className="beam-inner home-sample-card">
                  <div className="home-sample-week">{home.sampleTheCourse.sampleWeekPrefix} {sample.week}</div>
                  <h3>{sample.title}</h3>
                  <p className="home-sample-description">{sample.description}</p>
                  <div className="home-sample-detail">
                    <div className="home-sample-detail-item">
                      <i className="fas fa-book-open"></i>
                      <div>
                        <strong>{home.sampleTheCourse.storyLabel}</strong>
                        <p>{sample.story}</p>
                      </div>
                    </div>
                    <div className="home-sample-detail-item">
                      <i className="fas fa-hands"></i>
                      <div>
                        <strong>{home.sampleTheCourse.practiceLabel}</strong>
                        <p>{sample.practice}</p>
                      </div>
                    </div>
                  </div>
                  <Link to={sample.link} className="home-sample-link">
                    {home.sampleTheCourse.readFullSampleText} <i className="fas fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="social-proof reveal">
        <div className="container">
          <div className="social-proof-layout">
            <div className="social-proof-video-side">
              <VideoPlayer src={home.socialProof.videoSrc} />
            </div>
            <div className="social-proof-text-side">
              <div className="social-proof-quote-mark">&ldquo;</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="social-proof-content"
                >
                  <p className="social-proof-quote">
                    {home.socialProof.testimonials[currentTestimonial].quote}
                  </p>
                  <div className="social-proof-author">
                    <span className="social-proof-name">{home.socialProof.testimonials[currentTestimonial].name}</span>
                    <span className="social-proof-role">{home.socialProof.testimonials[currentTestimonial].role}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="social-proof-dots">
                {home.socialProof.testimonials.map((_, i) => (
                  <button
                    key={i}
                    className={`social-proof-dot ${i === currentTestimonial ? 'active' : ''}`}
                    onClick={() => setCurrentTestimonial(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Course Includes */}
      <section className="home-components reveal">
        <div className="container">
          <h2 className="section-title">{home.courseIncludes.title}</h2>
          <p className="section-description">{home.courseIncludes.description}</p>
          <div className="home-components-grid">
            {home.courseIncludes.cards.map((card, i) => (
              <div key={card.heading} className={`beam-wrap reveal-bounce reveal-delay-${(i % 3) + 1}`}>
                <div className="beam-border" />
                <div className="beam-inner value-card">
                  <div className="value-icon">
                    <i className={card.icon}></i>
                  </div>
                  <h3>{card.heading}</h3>
                  <p>{card.description}</p>
                  <Link to={card.linkHref} className="value-card-link">
                    {card.linkText} <i className="fas fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Worldwide */}
      <section className="home-languages reveal">
        <div className="container">
          <h2 className="section-title">{home.languages.title}</h2>
          <p className="section-description">{home.languages.description}</p>
          <div className="home-languages-grid">
            {home.languages.items.map((lang) =>
              lang.url ? (
                lang.url.startsWith('/') ? (
                  <a
                    key={lang.en}
                    href={lang.url}
                    className="home-language-tag home-language-tag--link"
                    title={`${lang.en} — ${lang.native}`}
                    onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    <span className="home-language-native">{lang.native}</span>
                    <span className="home-language-en">{lang.en}</span>
                  </a>
                ) : (
                  <a
                    key={lang.en}
                    href={lang.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-language-tag home-language-tag--link"
                    title={`${lang.en} — ${lang.native}`}
                  >
                    <span className="home-language-native">{lang.native}</span>
                    <span className="home-language-en">{lang.en}</span>
                  </a>
                )
              ) : (
                <span key={lang.en} className="home-language-tag home-language-tag--nolink" title={`${lang.en} — coming soon`}>
                  <span className="home-language-native">{lang.native}</span>
                  <span className="home-language-en">{lang.en}</span>
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Donate Banner */}
      <section className="home-donate-banner reveal">
        <div className="container">
          <div className="home-donate-banner-inner">
            <div className="home-donate-banner-text">
              <h3>{shared.donateBanner.heading}</h3>
              <p>{shared.donateBanner.text}</p>
            </div>
            <a href="https://compassioncf.com/donate" target="_blank" rel="noopener noreferrer" className="btn-primary home-donate-banner-btn">
              <i className="fas fa-heart"></i> {shared.donateBanner.buttonText}
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="register" className="cta reveal">
        <div className="container">
          <div className="cta-content">
            <h2>{home.cta.heading}</h2>
            <p>{home.cta.description}</p>
            <div className="cta-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={home.cta.buttonPrimary}
              />
              <Link to={home.cta.buttonSecondaryLink} className="btn-secondary">
                {home.cta.buttonSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ElevenLabs AI Agent — floating chat bubble */}
      <div ref={chatbotContainerRef} className="chatbot-widget-container" />
    </Layout>
  );
};

export default HomePage;
