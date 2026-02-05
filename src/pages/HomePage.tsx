import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnimatedText from '../components/AnimatedText';
import JotformPopup from '../components/JotformPopup';
import { useContent } from '../context/ContentContext';
import { renderHTML } from '../utils/contentUtils';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

const HomePage: React.FC = () => {
  const { getContent } = useContent();
  const heroSectionRef = useRef<HTMLElement>(null);
  const chatbotContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize hero background image
    const heroSection = heroSectionRef.current;
    if (!heroSection) return;

    // Test if image loads
    const img = new Image();
    img.onload = function() {
      console.log('Hero background image loaded successfully');
      heroSection.classList.add('with-bg');
    };
    img.onerror = function() {
      console.error('Failed to load hero background image');
      // Keep the gradient background as fallback
    };
    img.src = '/hero-background.jpg';

    // Fallback: add class after a delay even if image doesn't load
    const fallbackTimeout = setTimeout(() => {
      if (!heroSection.classList.contains('with-bg')) {
        heroSection.classList.add('with-bg');
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Load ElevenLabs chatbot script and create widget
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (existingScript || !chatbotContainerRef.current) {
      return;
    }

    // Load the ElevenLabs widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-elevenlabs-chatbot', 'true');
    
    // Create the custom element after script loads
    script.onload = () => {
      if (chatbotContainerRef.current) {
        // Clear any existing content
        chatbotContainerRef.current.innerHTML = '';
        // Create the custom element
        const chatbotElement = document.createElement('elevenlabs-convai');
        chatbotElement.setAttribute('agent-id', 'agent_0301kaf26r60eqkr3x8qe2v8wdq0');
        chatbotContainerRef.current.appendChild(chatbotElement);
      }
    };
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const scriptToRemove = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      if (chatbotContainerRef.current) {
        chatbotContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section id="home" className="hero" ref={heroSectionRef}>
        <div className="hero-container">
          <div className="hero-content">
            <img
              src="/Logo-3.0.png"
              alt="The Compassion Course"
              className="hero-logo"
            />
            <p className="hero-subtitle">
              {getContent('hero', 'subtitle', 'Changing lives in over 120 Countries')}
            </p>
            <AnimatedText />

            <div className="hero-buttons">
              <a href="#learn-more" className="btn-primary">
                {getContent('hero', 'ctaPrimary', 'Learn More About The Course')}
              </a>
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText={getContent('hero', 'ctaSecondary', 'Register for the Compassion course')}
              />
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <h3>{getContent('hero-stats', 'stat1-title', 'Global Leader')}</h3>
              <p dangerouslySetInnerHTML={renderHTML(
                getContent('hero-stats', 'stat1-description', 
                  'Compassion Course is an internationally recognized personal and professional growth, training, and development company with a community of more than 30,000 participants.')
              )} />
            </div>
            <div className="stat-item">
              <h3>{getContent('hero-stats', 'stat2-title', 'Leading-Edge Methodology')}</h3>
              <p dangerouslySetInnerHTML={renderHTML(
                getContent('hero-stats', 'stat2-description',
                  'Our industry-leading approach enables people to both produce extraordinary results and enhance the quality of their lives through our proprietary technology.')
              )} />
            </div>
            <div className="stat-item">
              <h3>{getContent('hero-stats', 'stat3-title', 'Individualized Impact')}</h3>
              <p dangerouslySetInnerHTML={renderHTML(
                getContent('hero-stats', 'stat3-description',
                  'Designed to make a unique difference for each participant, independent surveys show <em>"94% of participants agree The Compassion Course made a profound and lasting difference in their lives."</em>')
              )} />
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="programs">
        <div className="container">
          <h2 className="section-title">
            {getContent('programs', 'title', 'After The Compassion Course - A World of Possibilities')}
          </h2>
          <p className="section-description" dangerouslySetInnerHTML={renderHTML(
            getContent('programs', 'description',
              'Discover a world of possibilities where you continue to expand your power, effectiveness, and self-expression; where you can make a difference; or where you can participate with our Global Community – delivered in various formats and all designed to empower you to impact what you care about most.')
          )} />
          
          <div className="programs-grid">
            <div className="program-card">
              <div className="program-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3>Advanced Programs</h3>
              <p>From in-depth weekend courses to weekly seminars, from one-on-one coaching to powerful on-demand content, we deliver a large range of offerings that will have you realize what matters most to you.</p>
              <a href="#advanced" className="program-link">Explore Advanced Programs</a>
            </div>

            <div className="program-card">
              <div className="program-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>The Community</h3>
              <p>Participate in one or all of the networks that make up the rich and diverse Compassion Course Community – engage in unique, powerful and fun conversations in areas that interest you.</p>
              <a href="#community" className="program-link">Join the Community</a>
            </div>

            <div className="program-card">
              <div className="program-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>Make a Difference</h3>
              <p>Through our industry leading training, the Compassion Course Training Academy powerfully expands your ability to be a leader and make a difference in the lives of others.</p>
              <a href="#training" className="program-link">Learn About Training</a>
            </div>

            <div className="program-card">
              <div className="program-icon">
                <i className="fas fa-building"></i>
              </div>
              <h3>Corporate Programs</h3>
              <p>Discover why thousands of businesses encourage their employees to attend our public programs to cause breakthroughs in their individual performance.</p>
              <a href="#corporate" className="program-link">Corporate Solutions</a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2 className="section-title">
            {getContent('testimonials', 'title', 'What People Say')}
          </h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"The Compassion Course completely transformed how I approach relationships and challenges. I discovered tools I never knew I had within me."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <h4>Sarah Johnson</h4>
                  <span>Marketing Executive</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"In just three days, I gained clarity on what was holding me back in my career and personal life. The results have been extraordinary."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <h4>Michael Chen</h4>
                  <span>Software Engineer</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"The community aspect is incredible. I've made lifelong connections with people who are committed to growth and making a difference."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <h4>Emily Rodriguez</h4>
                  <span>Nonprofit Director</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compass Companion Section */}
      <section id="compass-companion" className="compass-companion">
        <div className="container">
          <div className="compass-companion-content">
            <a 
              href="https://www.compass-companions.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="compass-companion-link"
            >
              Compass Companion
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>{getContent('about', 'title', 'About the Compassion Course')}</h2>
              <p dangerouslySetInnerHTML={renderHTML(
                getContent('about', 'description',
                  'Changing Lives for 14 Years, with more than 30,000 Participants, in over 120 Countries, in 20 Languages.')
              )} />
              <div className="about-stats">
                <div className="stat">
                  <h3>{getContent('about', 'stat1-value', '30,000+')}</h3>
                  <p>{getContent('about', 'stat1-label', 'Participants')}</p>
                </div>
                <div className="stat">
                  <h3>{getContent('about', 'stat2-value', '120+')}</h3>
                  <p>{getContent('about', 'stat2-label', 'Countries')}</p>
                </div>
              </div>
            </div>
            <div className="about-image">
              <div className="team-photo-grid-main" id="team-photo-grid-main">
                {/* Team photos will be loaded here */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="register" className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>{getContent('cta', 'title', 'Ready to Transform Your Life?')}</h2>
            <p dangerouslySetInnerHTML={renderHTML(
              getContent('cta', 'description',
                'Join thousands of others who have discovered their potential through the Compassion Course.')
            )} />
            <div className="cta-buttons">
              <a href="#schedule" className="btn-primary">
                {getContent('cta', 'buttonPrimary', 'Check out our Course Schedule')}
              </a>
              <Link to="/contact" className="btn-secondary">
                {getContent('cta', 'buttonSecondary', 'Contact Us Today')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ElevenLabs Chatbot Widget */}
      <div ref={chatbotContainerRef}></div>
    </Layout>
  );
};

export default HomePage;
