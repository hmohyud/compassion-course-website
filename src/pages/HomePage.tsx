import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '../components/Layout';
import Globe from '../components/Globe';
import StarrySky from '../components/StarrySky';
import JotformPopup from '../components/JotformPopup';
import { useContent } from '../context/ContentContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { siteContent } from '../data/siteContent';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

const { home, shared } = siteContent;

const HomePage: React.FC = () => {
  const { getContent } = useContent();
  // const chatbotContainerRef = useRef<HTMLDivElement>(null); // ElevenLabs — commented out
  const heroLogoRef = useRef<HTMLImageElement>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useScrollReveal();

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

  // ElevenLabs chatbot — commented out for now
  // useEffect(() => {
  //   const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
  //   if (existingScript || !chatbotContainerRef.current) return;
  //
  //   const script = document.createElement('script');
  //   script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
  //   script.async = true;
  //   script.type = 'text/javascript';
  //   script.setAttribute('data-elevenlabs-chatbot', 'true');
  //   script.onload = () => {
  //     if (chatbotContainerRef.current) {
  //       chatbotContainerRef.current.innerHTML = '';
  //       const chatbotElement = document.createElement('elevenlabs-convai');
  //       chatbotElement.setAttribute('agent-id', 'agent_0301kaf26r60eqkr3x8qe2v8wdq0');
  //       chatbotContainerRef.current.appendChild(chatbotElement);
  //     }
  //   };
  //   document.head.appendChild(script);
  //
  //   return () => {
  //     const scriptToRemove = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
  //     if (scriptToRemove) scriptToRemove.remove();
  //     if (chatbotContainerRef.current) chatbotContainerRef.current.innerHTML = '';
  //   };
  // }, []);

  return (
    <Layout>
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
                <h1 className="hero-heading">{home.hero.heading.split(' ').map((word, i) => <React.Fragment key={i}>{i > 0 && <br />}{word}</React.Fragment>)}</h1>
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
          </div>
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
              <video
                controls
                preload="metadata"
                poster="/images/how-it-works-video.jpg"
              >
                <source src={home.peaceEducation.videoSrc} type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="home-impact-stats">
            {home.peaceEducation.stats.map((stat) => (
              <div key={stat.label} className="home-impact-stat">
                <div className="home-impact-stat-number">{stat.number}</div>
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
            {home.sampleTheCourse.weeks.map((sample) => (
              <div key={sample.week} className="home-sample-card reveal">
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
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="social-proof reveal">
        <div className="container">
          <div className="social-proof-layout">
            <div className="social-proof-video-side">
              <video controls preload="metadata">
                <source src={home.socialProof.videoSrc} type="video/mp4" />
              </video>
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
              <div key={card.heading} className={`value-card reveal reveal-delay-${(i % 3) + 1}`}>
                <div className="value-icon">
                  <i className={card.icon}></i>
                </div>
                <h3>{card.heading}</h3>
                <p>{card.description}</p>
                <Link to={card.linkHref} className="value-card-link">
                  {card.linkText} <i className="fas fa-arrow-right"></i>
                </Link>
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
              ) : (
                <span key={lang.en} className="home-language-tag" title={lang.en}>
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

      {/* ElevenLabs Chatbot Widget — commented out for now */}
      {/* <div ref={chatbotContainerRef} className="chatbot-widget-container" /> */}
    </Layout>
  );
};

export default HomePage;
