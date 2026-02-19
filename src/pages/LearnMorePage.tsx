import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import JotformPopup from '../components/JotformPopup';
import { useScrollReveal } from '../hooks/useScrollReveal';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

const syllabus = [
  {
    phase: 'Foundation',
    weeks: '1 \u2013 4',
    icon: 'fas fa-seedling',
    topics: [
      'Feelings & needs awareness',
      'Self-empathy fundamentals',
      'How feelings arise from met/unmet needs',
      'Building a daily practice',
    ],
  },
  {
    phase: 'Empathy & Emotional Awareness',
    weeks: '5 \u2013 10',
    icon: 'fas fa-heart',
    topics: [
      'Empathy vs. sympathy',
      'Emotional triggers & reactions',
      'Silent empathy & presence',
      'Understanding anger as unmet needs',
    ],
  },
  {
    phase: 'Communication & Boundaries',
    weeks: '11 \u2013 17',
    icon: 'fas fa-comments',
    topics: [
      'Honest self-expression',
      'Making clear requests',
      'Navigating difficult conversations',
      'Protective vs. punitive boundaries',
    ],
  },
  {
    phase: 'Beliefs, Observation & Gratitude',
    weeks: '18 \u2013 26',
    icon: 'fas fa-eye',
    topics: [
      'Observation vs. evaluation',
      'Identifying limiting beliefs',
      'Transforming judgments',
      'Gratitude & appreciation practices',
    ],
  },
  {
    phase: 'Advanced Emotional Work',
    weeks: '27 \u2013 38',
    icon: 'fas fa-brain',
    topics: [
      'Mourning & healing old patterns',
      'Working with shame & guilt',
      'Conflict resolution strategies',
      'Power dynamics & social systems',
    ],
  },
  {
    phase: 'Integration & Mastery',
    weeks: '39 \u2013 52',
    icon: 'fas fa-star',
    topics: [
      'Deepening daily practice',
      'Living compassion in community',
      'Mentoring & supporting others',
      'Celebration & completion',
    ],
  },
];

const stats = [
  { number: '50,000+', label: 'Participants', icon: 'fas fa-users' },
  { number: '120+', label: 'Countries', icon: 'fas fa-globe-americas' },
  { number: '20+', label: 'Languages', icon: 'fas fa-language' },
  { number: '52', label: 'Weeks', icon: 'fas fa-calendar-alt' },
];

const howItWorks = [
  {
    step: '1',
    title: 'Weekly Lessons',
    description: 'Every Wednesday you receive a lesson by email with concepts, reflections, and real-life exercises to practice throughout the week.',
    icon: 'fas fa-envelope-open-text',
  },
  {
    step: '2',
    title: 'Monthly Live Sessions',
    description: 'Join live 90-minute Zoom conferences led by Thom Bond on the second Monday of each month for interactive Q&A and group practice.',
    icon: 'fas fa-video',
  },
  {
    step: '3',
    title: 'Global Community',
    description: 'Connect with participants worldwide through the community platform, practice groups, and peer support circles.',
    icon: 'fas fa-globe',
  },
  {
    step: '4',
    title: 'AI-Powered Mentor',
    description: 'Get personalized guidance anytime through the AI Compassion Mentor, trained on the course material to support your learning journey.',
    icon: 'fas fa-robot',
  },
];

const faqs = [
  {
    question: 'When does the course start?',
    answer: 'The Compassion Course runs once per year, typically from June to June. Registration opens on March 1st annually and closes by the second Wednesday of July.',
  },
  {
    question: 'How much time does it take each week?',
    answer: 'Each weekly lesson takes about 15\u201320 minutes to read. The real learning happens through brief daily practice moments woven into your everyday life \u2014 no extra time block required.',
  },
  {
    question: 'Do I need any prior experience?',
    answer: 'No prior experience is needed. The course is designed for beginners and experienced practitioners alike. The 52-week structure allows concepts to build gradually.',
  },
  {
    question: 'Is there a certification?',
    answer: 'Yes. Participants can earn up to 18 CNVC (Center for Nonviolent Communication) certification hours by completing the course requirements.',
  },
  {
    question: 'What if I fall behind?',
    answer: 'All lessons remain accessible throughout the year. You can catch up at your own pace. Many participants revisit earlier lessons as their understanding deepens.',
  },
  {
    question: 'Is financial assistance available?',
    answer: 'Yes. The Compassion Course is committed to accessibility and offers financial assistance so that cost is never a barrier to participation.',
  },
];

const LearnMorePage: React.FC = () => {
  useScrollReveal();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="learn-hero">
        <div className="learn-hero-inner">
          <p className="learn-hero-eyebrow">A 52-Week Journey</p>
          <h1 className="learn-hero-heading">
            Discover The Compassion Course
          </h1>
          <p className="learn-hero-description">
            An internationally recognized program that has helped over 50,000 people
            in 120+ countries develop empathy, resolve conflict, and build deeper
            connections \u2014 one week at a time.
          </p>
          <div className="learn-hero-buttons">
            <JotformPopup
              formId={JOTFORM_FORM_ID}
              buttonText="Register Now"
            />
            <a href="#how-it-works" className="btn-secondary">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="learn-stats reveal">
        <div className="container">
          <div className="learn-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="learn-stat-card">
                <div className="learn-stat-icon">
                  <i className={stat.icon}></i>
                </div>
                <div className="learn-stat-number">{stat.number}</div>
                <div className="learn-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="learn-what reveal">
        <div className="container">
          <h2 className="section-title">What You Will Learn</h2>
          <p className="section-description">
            Over 52 weeks, you will develop practical skills for empathy,
            self-awareness, and compassionate communication that transform every
            area of your life.
          </p>
          <div className="learn-what-grid">
            <div className="learn-what-card reveal reveal-delay-1">
              <div className="value-icon">
                <i className="fas fa-hand-holding-heart"></i>
              </div>
              <h3>Self-Empathy</h3>
              <p>
                Learn to recognize your own feelings and needs so you can respond
                to life with clarity instead of reactivity.
              </p>
            </div>
            <div className="learn-what-card reveal reveal-delay-2">
              <div className="value-icon">
                <i className="fas fa-people-arrows"></i>
              </div>
              <h3>Empathy for Others</h3>
              <p>
                Develop the ability to truly hear and understand others, even in
                moments of conflict or disagreement.
              </p>
            </div>
            <div className="learn-what-card reveal reveal-delay-3">
              <div className="value-icon">
                <i className="fas fa-comment-dots"></i>
              </div>
              <h3>Honest Expression</h3>
              <p>
                Speak your truth in a way that creates connection rather than
                defensiveness, even in difficult conversations.
              </p>
            </div>
            <div className="learn-what-card reveal reveal-delay-1">
              <div className="value-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <h3>Emotional Triggers</h3>
              <p>
                Understand and work with anger, shame, and reactivity as signals
                pointing to your deeper needs.
              </p>
            </div>
            <div className="learn-what-card reveal reveal-delay-2">
              <div className="value-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Healthy Boundaries</h3>
              <p>
                Set boundaries that protect your well-being while maintaining
                respect and care for those around you.
              </p>
            </div>
            <div className="learn-what-card reveal reveal-delay-3">
              <div className="value-icon">
                <i className="fas fa-sun"></i>
              </div>
              <h3>Gratitude & Celebration</h3>
              <p>
                Cultivate practices of appreciation that shift your perspective
                and deepen your sense of well-being.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="learn-how reveal">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-description">
            The course is designed to fit naturally into your life. No classrooms,
            no rigid schedules \u2014 just a supportive weekly rhythm.
          </p>
          <div className="learn-how-grid">
            {howItWorks.map((item) => (
              <div key={item.step} className="learn-how-card reveal">
                <div className="learn-how-step">{item.step}</div>
                <div className="learn-how-icon">
                  <i className={item.icon}></i>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Syllabus */}
      <section className="learn-syllabus reveal">
        <div className="container">
          <h2 className="section-title">Course Journey</h2>
          <p className="section-description">
            Six phases that progressively deepen your understanding and practice
            of compassion over the full year.
          </p>
          <div className="learn-syllabus-timeline">
            {syllabus.map((phase, index) => (
              <div
                key={phase.phase}
                className={`learn-syllabus-item reveal ${index % 2 === 0 ? 'learn-syllabus-item--left' : 'learn-syllabus-item--right'}`}
              >
                <div className="learn-syllabus-marker">
                  <div className="learn-syllabus-dot">
                    <i className={phase.icon}></i>
                  </div>
                </div>
                <div className="learn-syllabus-content">
                  <div className="learn-syllabus-weeks">Weeks {phase.weeks}</div>
                  <h3>{phase.phase}</h3>
                  <ul>
                    {phase.topics.map((topic) => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Thom Bond */}
      <section className="learn-founder reveal">
        <div className="container">
          <div className="learn-founder-inner">
            <div className="learn-founder-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>About the Founder</h2>
              <h3 className="learn-founder-name">Thom Bond</h3>
              <p>
                Thom Bond is the founder of the New York Center for Nonviolent
                Communication (NYCNVC) and creator of The Compassion Course. A
                certified trainer with the international Center for Nonviolent
                Communication, Thom has spent decades bringing the principles of
                empathy and compassion to people around the world.
              </p>
              <p>
                Drawing on the work of Marshall Rosenberg, Werner Erhard, and
                Albert Ellis, Thom developed The Compassion Course to make these
                transformative practices accessible to anyone, anywhere \u2014
                regardless of background or experience.
              </p>
              <p>
                Under his guidance, the course has grown from a small New York
                workshop into a global community spanning 120+ countries and 20+
                languages.
              </p>
            </div>
            <div className="learn-founder-visual">
              <div className="learn-founder-quote-card">
                <div className="learn-founder-quote-mark">&ldquo;</div>
                <p className="learn-founder-quote-text">
                  Compassion is not something we need to learn. It is something
                  we need to remember.
                </p>
                <span className="learn-founder-quote-attr">&mdash; Thom Bond</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="learn-faq reveal">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-description">
            Everything you need to know about joining The Compassion Course.
          </p>
          <div className="learn-faq-list">
            {faqs.map((faq, index) => (
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
                    maxHeight: openFaq === index ? '200px' : '0',
                    opacity: openFaq === index ? 1 : 0,
                  }}
                >
                  <p>{faq.answer}</p>
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
            <h2>Ready to Begin Your Journey?</h2>
            <p>
              Join a global community dedicated to building a more compassionate
              world \u2014 starting with yourself.
            </p>
            <div className="cta-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText="Register for the Course"
              />
              <Link to="/contact" className="btn-secondary">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LearnMorePage;
