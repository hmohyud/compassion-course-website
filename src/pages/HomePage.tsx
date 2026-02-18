import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '../components/Layout';
import Globe from '../components/Globe';
import StarrySky from '../components/StarrySky';
import JotformPopup from '../components/JotformPopup';
import { useContent } from '../context/ContentContext';
import { renderHTML } from '../utils/contentUtils';
import { useScrollReveal } from '../hooks/useScrollReveal';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

const testimonials = [
  {
    quote: 'The Compassion Course completely transformed how I approach relationships and challenges. I discovered tools I never knew I had within me.',
    name: 'Sarah Johnson',
    role: 'Marketing Executive',
  },
  {
    quote: 'In just three days, I gained clarity on what was holding me back in my career and personal life. The results have been extraordinary.',
    name: 'Michael Chen',
    role: 'Software Engineer',
  },
  {
    quote: 'The community aspect is incredible. I\'ve made lifelong connections with people who are committed to growth and making a difference.',
    name: 'Emily Rodriguez',
    role: 'Nonprofit Director',
  },
];

const HomePage: React.FC = () => {
  const { getContent } = useContent();
  const chatbotContainerRef = useRef<HTMLDivElement>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useScrollReveal();

  // Rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Load ElevenLabs chatbot script
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
        chatbotElement.setAttribute('variant', 'tiny');
        chatbotElement.setAttribute('override-text-only', 'true');
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
      {/* Hero Section — Globe + Title */}
      <section className="hero">
        <StarrySky />
        <div className="hero-grid">
          <div className="hero-text">
            <p className="hero-eyebrow">
              {getContent('hero', 'subtitle', 'Changing lives in over 120 Countries')}
            </p>
            <h1 className="hero-heading">
              The <span style={{ whiteSpace: 'nowrap' }}>C<img src="/logo_heart.png" alt="o" className="hero-heart-inline" />mpassion</span><br />Course
            </h1>
            <p className="hero-description">
              {getContent('hero-stats', 'stat1-description',
                'An internationally recognized personal growth and development community with more than 30,000 participants worldwide.'
              )}
            </p>
            <div className="hero-buttons">
              <a href="#learn-more" className="btn-primary">
                {getContent('hero', 'ctaPrimary', 'Learn More')}
              </a>
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={getContent('hero', 'ctaSecondary', 'Register Now')}
              />
            </div>
          </div>
          <div className="hero-globe">
            <Globe />
            <img
              src="/mother-embrace-no-sphere.png"
              alt="Woman compassionately embracing the globe"
              className="hero-embrace-overlay"
            />
            <img
              src="/top_hand.png"
              alt="Hand reaching over the globe"
              className="hero-hand-overlay"
            />
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="learn-more" className="value-props reveal">
        <div className="container">
          <h2 className="section-title">
            {getContent('programs', 'title', 'Why The Compassion Course')}
          </h2>
          <p className="section-description" dangerouslySetInnerHTML={renderHTML(
            getContent('programs', 'description',
              'Discover a world of possibilities designed to empower you to impact what you care about most.')
          )} />

          <div className="value-props-grid">
            <div className="value-card reveal reveal-delay-1">
              <div className="value-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>Build Empathy</h3>
              <p>Develop lasting empathy practices that transform your relationships and deepen your understanding of yourself and others.</p>
            </div>
            <div className="value-card reveal reveal-delay-2">
              <div className="value-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Global Community</h3>
              <p>Join a diverse network of over 30,000 participants across 120+ countries committed to compassion and personal growth.</p>
            </div>
            <div className="value-card reveal reveal-delay-3">
              <div className="value-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3>Proven Methodology</h3>
              <p>Our leading-edge approach enables people to produce extraordinary results and enhance the quality of their lives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="social-proof reveal">
        <div className="container">
          <div className="social-proof-inner">
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
                  {testimonials[currentTestimonial].quote}
                </p>
                <div className="social-proof-author">
                  <span className="social-proof-name">{testimonials[currentTestimonial].name}</span>
                  <span className="social-proof-role">{testimonials[currentTestimonial].role}</span>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="social-proof-dots">
              {testimonials.map((_, i) => (
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
      </section>

      {/* CTA Section */}
      <section id="register" className="cta reveal">
        <div className="container">
          <div className="cta-content">
            <h2>{getContent('cta', 'title', 'Ready to Transform Your Life?')}</h2>
            <p dangerouslySetInnerHTML={renderHTML(
              getContent('cta', 'description',
                'Join thousands of others who have discovered their potential through the Compassion Course.')
            )} />
            <div className="cta-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={getContent('cta', 'buttonPrimary', 'Register for the Course')}
              />
              <Link to="/contact" className="btn-secondary">
                {getContent('cta', 'buttonSecondary', 'Contact Us')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ElevenLabs Chatbot Widget */}
      <div ref={chatbotContainerRef} className="chatbot-widget-container" />
    </Layout>
  );
};

export default HomePage;
