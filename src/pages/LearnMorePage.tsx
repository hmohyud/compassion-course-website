import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import JotformPopup from '../components/JotformPopup';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { siteContent } from '../data/siteContent';
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

// Collapsible section for sample week content
const CollapsibleSection: React.FC<{
  labelClass?: string;
  icon: string;
  title: string;
  cardClass?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ labelClass = '', icon, title, cardClass = '', defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`learn-sample-collapsible ${cardClass} ${isOpen ? 'learn-sample-collapsible--open' : ''}`}>
      <button
        className={`learn-sample-section-label ${labelClass}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        type="button"
      >
        <i className={icon}></i>
        <span>{title}</span>
        <i className={`fas fa-chevron-down learn-sample-chevron ${isOpen ? 'learn-sample-chevron--open' : ''}`}></i>
      </button>
      <div className={`learn-sample-collapsible-body ${isOpen ? 'learn-sample-collapsible-body--open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

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
              <video controls preload="metadata" poster="/images/origin-conversation.jpg">
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

      {/* Sample Week 1 — Empathy */}
      <section id="sample-empathy" className="learn-sample reveal">
        <div className="container">
          <div className="learn-sample-header">
            <span className="learn-sample-badge">{learnMore.sampleEmpathy.badge}</span>
            <h2 className="section-title">{learnMore.sampleEmpathy.title}</h2>
          </div>
          <div className="learn-sample-body">
            {/* Opening Quote */}
            {'quote' in learnMore.sampleEmpathy && (
              <blockquote className="learn-sample-quote">
                <span className="learn-sample-quote-mark">{'\u201C'}</span>
                <p>{(learnMore.sampleEmpathy as any).quote.text}</p>
                <cite>{'\u2014'} {(learnMore.sampleEmpathy as any).quote.author}</cite>
              </blockquote>
            )}

            {/* The Concept — always visible */}
            <div className="learn-sample-concept">
              <div className="learn-sample-section-label">
                <i className="fas fa-lightbulb"></i>
                <span>{learnMore.sampleEmpathy.concept.heading}</span>
              </div>
              {'paragraphs' in learnMore.sampleEmpathy.concept &&
                (learnMore.sampleEmpathy.concept as any).paragraphs.map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))
              }
            </div>

            {/* Non-Empathic Examples — collapsible */}
            {'nonEmpathicExamples' in learnMore.sampleEmpathy && (
              <CollapsibleSection
                icon="fas fa-comments"
                title="What Empathy Is Not"
                labelClass="learn-sample-section-label--accent"
                cardClass="learn-sample-examples"
              >
                <p className="learn-sample-examples-intro">
                  {(learnMore.sampleEmpathy as any).examplesIntro}
                </p>
                <div className="learn-sample-example-prompt">
                  <i className="fas fa-quote-left learn-sample-prompt-icon"></i>
                  <p>{(learnMore.sampleEmpathy as any).examplePrompt}</p>
                </div>
                <div className="learn-sample-examples-list">
                  {(learnMore.sampleEmpathy as any).nonEmpathicExamples.map((ex: any, i: number) => (
                    <div key={ex.heading} className="learn-sample-example-item">
                      <div className="learn-sample-example-number">{i + 1}</div>
                      <div className="learn-sample-example-content">
                        <h4>{ex.heading}</h4>
                        <p className="learn-sample-example-quote">{ex.text}</p>
                        <div className="learn-sample-example-reflection">
                          <i className="fas fa-seedling"></i>
                          <span>{ex.reflection}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Empathy Conclusion — collapsible */}
            {'empathyConclusion' in learnMore.sampleEmpathy && (
              <CollapsibleSection
                icon="fas fa-heart"
                title="So What Then? Perhaps Empathy"
                labelClass="learn-sample-section-label--warm"
                cardClass="learn-sample-conclusion"
              >
                {(learnMore.sampleEmpathy as any).empathyConclusion.map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </CollapsibleSection>
            )}

            {/* The Story — collapsible */}
            <CollapsibleSection
              icon="fas fa-book-open"
              title={learnMore.sampleEmpathy.story.heading}
              labelClass="learn-sample-section-label--story"
              cardClass="learn-sample-story"
            >
              <div className="learn-sample-story-content">
                {'paragraphs' in learnMore.sampleEmpathy.story
                  ? (learnMore.sampleEmpathy.story as any).paragraphs.map((para: string, i: number) => (
                      <p key={i}>{para}</p>
                    ))
                  : <p>{(learnMore.sampleEmpathy.story as any).text}</p>
                }
              </div>
            </CollapsibleSection>

            {/* Practices — collapsible */}
            <CollapsibleSection
              icon="fas fa-hands"
              title={learnMore.sampleEmpathy.practicesHeading}
              labelClass="learn-sample-section-label--practice"
              cardClass="learn-sample-practice"
            >
              <div className="learn-sample-practice-list">
                {learnMore.sampleEmpathy.practices.map((practice, i) => (
                  <div key={practice.heading} className="learn-sample-practice-item">
                    <div className="learn-sample-practice-number">{i + 1}</div>
                    <div className="learn-sample-practice-content">
                      <strong>{practice.heading}</strong>
                      <p>{practice.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </section>

      {/* Sample Week 2 — Appreciation */}
      <section id="sample-appreciation" className="learn-sample learn-sample--alt reveal">
        <div className="container">
          <div className="learn-sample-header">
            <span className="learn-sample-badge learn-sample-badge--alt">{learnMore.sampleAppreciation.badge}</span>
            <h2 className="section-title">{learnMore.sampleAppreciation.title}</h2>
          </div>
          <div className="learn-sample-body">
            {/* Opening Quote */}
            {'quote' in learnMore.sampleAppreciation && (
              <blockquote className="learn-sample-quote learn-sample-quote--alt">
                <span className="learn-sample-quote-mark">{'\u201C'}</span>
                <p>{(learnMore.sampleAppreciation as any).quote.text}</p>
                <cite>{'\u2014'} {(learnMore.sampleAppreciation as any).quote.author}</cite>
              </blockquote>
            )}

            {/* The Concept — always visible */}
            <div className="learn-sample-concept">
              <div className="learn-sample-section-label">
                <i className="fas fa-lightbulb"></i>
                <span>{learnMore.sampleAppreciation.concept.heading}</span>
              </div>
              {'sections' in learnMore.sampleAppreciation.concept
                ? (learnMore.sampleAppreciation.concept as any).sections.map((section: any, si: number) => (
                    <div key={si} className="learn-sample-concept-section">
                      {section.subheading && (
                        <h4 className="learn-sample-subheading">
                          <span className="learn-sample-subheading-marker"></span>
                          {section.subheading}
                        </h4>
                      )}
                      {section.paragraphs.map((para: string, pi: number) => (
                        <p key={pi}>{para}</p>
                      ))}
                    </div>
                  ))
                : 'paragraphs' in learnMore.sampleAppreciation.concept &&
                  (learnMore.sampleAppreciation.concept as any).paragraphs.map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))
              }
            </div>

            {/* The Story — collapsible */}
            <CollapsibleSection
              icon="fas fa-book-open"
              title={learnMore.sampleAppreciation.story.heading}
              labelClass="learn-sample-section-label--story"
              cardClass="learn-sample-story"
            >
              <div className="learn-sample-story-content">
                {'paragraphs' in learnMore.sampleAppreciation.story
                  ? (learnMore.sampleAppreciation.story as any).paragraphs.map((para: string, i: number) => (
                      <p key={i}>{para}</p>
                    ))
                  : <p>{(learnMore.sampleAppreciation.story as any).text}</p>
                }
              </div>
            </CollapsibleSection>

            {/* Practices — collapsible */}
            <CollapsibleSection
              icon="fas fa-hands"
              title={learnMore.sampleAppreciation.practicesHeading}
              labelClass="learn-sample-section-label--practice"
              cardClass="learn-sample-practice"
            >
              <div className="learn-sample-practice-list">
                {learnMore.sampleAppreciation.practices.map((practice, i) => (
                  <div key={practice.heading} className="learn-sample-practice-item">
                    <div className="learn-sample-practice-number">{i + 1}</div>
                    <div className="learn-sample-practice-content">
                      <strong>{practice.heading}</strong>
                      <p>{practice.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </section>

      {/* What Makes This Different */}
      <section id="what-makes-different" className="learn-different reveal">
        <div className="container">
          <h2 className="section-title">{learnMore.whatMakesDifferent.heading}</h2>
          <p className="section-description">{learnMore.whatMakesDifferent.subtitle}</p>
          <div className="learn-different-video">
            <video controls preload="metadata" poster="/images/hero-community.jpg">
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
      <section className="learn-faq reveal">
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
