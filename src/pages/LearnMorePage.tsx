import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import JotformPopup from '../components/JotformPopup';
import { useScrollReveal } from '../hooks/useScrollReveal';

const JOTFORM_FORM_ID = import.meta.env.VITE_JOTFORM_FORM_ID || '260333329475357';

const weeklyTopics = [
  { week: 1, title: 'Everything We Do, We Do to Meet a Need' },
  { week: 2, title: 'Most of Us Were Taught Something Else' },
  { week: 3, title: 'We Are All Equipped with Onboard Need Radar' },
  { week: 4, title: "What's the Big Deal with Needs?" },
  { week: 5, title: 'Empathy, the Breath of Compassion' },
  { week: 6, title: 'Hidden Judgments' },
  { week: 7, title: 'More About Feelings' },
  { week: 8, title: 'The Wisdom Inside the Judgment' },
  { week: 9, title: 'Why Is This So Bleeping Hard?' },
  { week: 10, title: "What Empathy Is... and What It's Not" },
];

const faqs = [
  {
    question: 'When does the course start?',
    answer: 'The Compassion Course runs once per year, beginning each June. Registration opens on March 1st and closes by the second Wednesday of July. The first monthly conference takes place on the second Monday of July.',
  },
  {
    question: 'How much time does it take each week?',
    answer: 'Each Wednesday lesson takes about 15\u201320 minutes to read. The real learning happens through brief practice moments woven into your everyday life \u2014 conversations, reactions, quiet reflections. No extra time block required.',
  },
  {
    question: 'Do I need any prior experience with NVC?',
    answer: 'Not at all. The course starts from the ground up and builds gradually over 52 weeks. Whether you\'ve never heard of Nonviolent Communication or you\'ve been practicing for years, the weekly rhythm meets you where you are.',
  },
  {
    question: 'Is there a certification option?',
    answer: 'Yes. You can earn a Certificate of Completion by tracking your weekly progress and keeping a private online journal throughout the year. Attending monthly conferences can also count toward CNVC certification hours \u2014 up to 18 hours from 12 calls.',
  },
  {
    question: 'What if I fall behind on weekly lessons?',
    answer: 'All 52 lessons remain accessible throughout the year. There are no deadlines or grades. Many participants revisit earlier lessons as their understanding deepens \u2014 the course is designed for exactly that.',
  },
  {
    question: 'Is the course available in other languages?',
    answer: 'Yes. The Compassion Course is translated and facilitated in 19 languages including Arabic, German, Spanish, Turkish, Portuguese, Polish, Dutch, Italian, and Finnish. Each language community has its own dedicated team and monthly conferences.',
  },
  {
    question: 'What is the cost? Is financial help available?',
    answer: 'Tuition is announced each March 1st when registration opens. Accessibility is a founding value of the course \u2014 alternative payment options are available so that cost is never a barrier to participation.',
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
          <p className="learn-hero-eyebrow">A Year-Long Journey in Compassion</p>
          <h1 className="learn-hero-heading">
            52 Weeks That Change How You<br />
            Relate to Yourself and Others
          </h1>
          <p className="learn-hero-description">
            Since 2011, The Compassion Course has guided over 50,000 people across
            120+ countries through a practical, week-by-week path to deeper empathy,
            honest communication, and real connection — built on the work of
            Marshall Rosenberg and Nonviolent Communication.
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

      {/* The Origin Story */}
      <section className="learn-origin reveal">
        <div className="container">
          <div className="learn-origin-inner">
            <div className="learn-origin-image">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&q=80"
                alt="Friends laughing together outdoors"
                loading="lazy"
              />
            </div>
            <div className="learn-origin-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>How It All Started</h2>
              <p>
                In 2002, Thom Bond was a successful environmental engineer when
                he picked up Marshall Rosenberg's book <em>Nonviolent Communication:
                A Language of Life</em>. He recognized something powerful — a
                human-oriented technology that could transform how people relate
                to each other.
              </p>
              <p>
                He closed his engineering firm, studied with Rosenberg directly,
                and in 2003 co-founded the New York Center for Nonviolent
                Communication. But Thom wanted these skills to reach anyone,
                anywhere — not just those who could attend workshops in New York.
              </p>
              <p>
                In 2011 he created The Compassion Course Online: a weekly email
                that would deliver one concept, one story, and one practice at
                a time — for a full year. What started as a simple idea has
                since grown into a global community spanning 120+ countries and
                19 languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="learn-stats reveal">
        <div className="container">
          <div className="learn-stats-grid">
            <div className="learn-stat-card">
              <div className="learn-stat-number">50,000+</div>
              <div className="learn-stat-label">People Have Taken the Course</div>
            </div>
            <div className="learn-stat-card">
              <div className="learn-stat-number">120+</div>
              <div className="learn-stat-label">Countries Represented</div>
            </div>
            <div className="learn-stat-card">
              <div className="learn-stat-number">19</div>
              <div className="learn-stat-label">Languages Available</div>
            </div>
            <div className="learn-stat-card">
              <div className="learn-stat-number">15</div>
              <div className="learn-stat-label">Years Running</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="learn-how reveal">
        <div className="container">
          <h2 className="section-title">How the Course Works</h2>
          <p className="section-description">
            No classrooms, no rigid schedules. The Compassion Course fits
            into the life you already have.
          </p>

          <div className="learn-how-steps">
            <div className="learn-how-step-card reveal">
              <div className="learn-how-step-number">1</div>
              <div className="learn-how-step-icon">
                <i className="fas fa-envelope-open-text"></i>
              </div>
              <h3>Wednesday Lessons</h3>
              <p>
                Every Wednesday at noon ET, a new lesson arrives in your inbox.
                Each one contains a concept to learn, a real story that
                illustrates it, and a practice to try in your daily life.
                About 15–20 minutes to read.
              </p>
            </div>

            <div className="learn-how-step-card reveal">
              <div className="learn-how-step-number">2</div>
              <div className="learn-how-step-icon">
                <i className="fas fa-video"></i>
              </div>
              <h3>Monthly Live Conferences</h3>
              <p>
                On the second Monday of each month, Thom Bond hosts a live
                90-minute Zoom session — interactive Q&A, group practice, and
                deeper exploration of the material. All 12 sessions are
                recorded if you can't make it live.
              </p>
            </div>

            <div className="learn-how-step-card reveal">
              <div className="learn-how-step-number">3</div>
              <div className="learn-how-step-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Practice &amp; Community</h3>
              <p>
                Connect through the Global Compassion Network — discussion
                groups, an empathy buddy directory to find practice partners,
                local practice groups led by trained alumni facilitators, and
                a mentoring program for ongoing support.
              </p>
            </div>

            <div className="learn-how-step-card reveal">
              <div className="learn-how-step-number">4</div>
              <div className="learn-how-step-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h3>AI Compassion Mentor</h3>
              <p>
                Between lessons and calls, the digital AI Mentor is available
                anytime — trained on the full course material to help you work
                through real situations, practice skills, and stay on track.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Actually Learn */}
      <section className="learn-peek reveal">
        <div className="container">
          <div className="learn-peek-inner">
            <div className="learn-peek-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>A Peek Inside the Course</h2>
              <p className="learn-peek-intro">
                The 52-week journey is built on one core idea: <strong>everything
                we do, we do to meet a need.</strong> Each week builds on the
                last, gradually shifting how you see yourself, others, and
                conflict itself. Here are the first 10 weeks:
              </p>
              <div className="learn-peek-list">
                {weeklyTopics.map((topic) => (
                  <div key={topic.week} className="learn-peek-item">
                    <span className="learn-peek-week">Week {topic.week}</span>
                    <span className="learn-peek-title">{topic.title}</span>
                  </div>
                ))}
              </div>
              <p className="learn-peek-more">
                ...and 42 more weeks covering boundaries, requests, anger, shame,
                beliefs, observation vs. evaluation, conflict resolution,
                appreciation, and ultimately — living with compassion as a
                daily practice.
              </p>
            </div>
            <div className="learn-peek-image">
              <img
                src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=640&q=80"
                alt="People connecting in warm conversation"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What Makes This Different */}
      <section className="learn-different reveal">
        <div className="container">
          <h2 className="section-title">What Makes This Different</h2>
          <p className="section-description">
            This isn't a weekend workshop that fades by Monday.
            It's a year of gradual, real change.
          </p>
          <div className="learn-different-grid">
            <div className="learn-different-card reveal">
              <div className="learn-different-icon">
                <i className="fas fa-calendar-week"></i>
              </div>
              <h3>52 Weeks, Not 2 Days</h3>
              <p>
                Real change takes practice. The weekly rhythm gives concepts
                time to become habits — integrated into your actual life,
                not just understood in theory.
              </p>
            </div>
            <div className="learn-different-card reveal">
              <div className="learn-different-icon">
                <i className="fas fa-layer-group"></i>
              </div>
              <h3>Three Traditions Combined</h3>
              <p>
                Draws on Marshall Rosenberg's NVC, Werner Erhard's
                transformational approach, and Albert Ellis's cognitive
                techniques — a combination you won't find elsewhere.
              </p>
            </div>
            <div className="learn-different-card reveal">
              <div className="learn-different-icon">
                <i className="fas fa-globe-americas"></i>
              </div>
              <h3>Truly Global Access</h3>
              <p>
                Available in 19 languages with dedicated teams of translators
                and facilitators. Financial accessibility is a founding value —
                cost is never meant to be a barrier.
              </p>
            </div>
            <div className="learn-different-card reveal">
              <div className="learn-different-icon">
                <i className="fas fa-hands-helping"></i>
              </div>
              <h3>Community, Not Isolation</h3>
              <p>
                Empathy buddies, practice groups, mentors, monthly live
                sessions — you're not learning alone. The relationships
                you build are part of the transformation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Thom Bond — with photo */}
      <section className="learn-founder reveal">
        <div className="container">
          <div className="learn-founder-inner">
            <div className="learn-founder-photo-side">
              <div className="learn-founder-photo-wrapper">
                <img
                  src="/Team/ThomBond.png"
                  alt="Thom Bond, founder of The Compassion Course"
                  className="learn-founder-photo"
                  loading="lazy"
                />
              </div>
              <div className="learn-founder-quote-card">
                <div className="learn-founder-quote-mark">&ldquo;</div>
                <p className="learn-founder-quote-text">
                  My way of making the skills of compassionate living available
                  to anyone, regardless of time and money constraints.
                </p>
                <span className="learn-founder-quote-attr">&mdash; Thom Bond, on creating the course</span>
              </div>
            </div>
            <div className="learn-founder-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>Meet Thom Bond</h2>
              <p>
                Thom Bond spent the first half of his career as an environmental
                engineer — developing energy-auditing software, microprocessor-based
                building controls, and LED lighting products. He was good at it.
                But in 2002, when he encountered Marshall Rosenberg's work on
                Nonviolent Communication, he saw a different kind of technology —
                one oriented around people instead of buildings.
              </p>
              <p>
                He closed his engineering firm to study and teach with Rosenberg
                full-time. In 2003, Thom and Nellie Bright co-founded the
                New York Center for Nonviolent Communication (NYCNVC), now a
                United Nations Civil Society Organization. In 2011, he created
                The Compassion Course Online to bring these skills to anyone in
                the world.
              </p>
              <p>
                Today, Thom leads monthly live conferences for participants,
                trains Organizer/Facilitators who run local practice groups
                worldwide, and continues developing new tools like the COMPASS
                Companions digital guides for conflict resolution.
              </p>
              <p>
                He is the author of <em>The Compassion Book: Lessons from The
                Compassion Course</em> and serves on the Advisory Board for the
                Communications Coordination Committee for the United Nations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo strip / social proof */}
      <section className="learn-photo-strip reveal">
        <div className="learn-photo-strip-inner">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" alt="Friends sharing a joyful moment together" loading="lazy" />
          <img src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&q=80" alt="People connecting in warm conversation" loading="lazy" />
          <img src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&q=80" alt="Community gathering with smiling faces" loading="lazy" />
          <img src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80" alt="Diverse group of friends laughing together" loading="lazy" />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="learn-faq reveal">
        <div className="container">
          <h2 className="section-title">Common Questions</h2>
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
                    maxHeight: openFaq === index ? '300px' : '0',
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
            <h2>Registration Opens March 1st</h2>
            <p>
              The next Compassion Course begins in June. Join 50,000+ people
              who have taken this journey toward more compassionate living.
            </p>
            <div className="cta-buttons">
              <JotformPopup
                formId={JOTFORM_FORM_ID}
                buttonText="Register for the Course"
              />
              <Link to="/about" className="btn-secondary">
                Meet the Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LearnMorePage;
