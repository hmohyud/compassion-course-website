import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnimatedText from '../components/AnimatedText';

const HomePage: React.FC = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Discover The Compassion Course</h1>
            <p className="hero-subtitle">Changing lives in over 120 Countries</p>
            <AnimatedText />

            <div className="hero-buttons">
              <a href="#learn-more" className="btn-primary">Learn More About The Course</a>
              <a href="#introduction" className="btn-secondary">Watch an Interactive Introduction</a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <h3>Global Leader</h3>
              <p>Compassion Course is an internationally recognized personal and professional growth, training, and development company with a community of more than 30,000 participants.</p>
            </div>
            <div className="stat-item">
              <h3>Leading-Edge Methodology</h3>
              <p>Our industry-leading approach enables people to both produce extraordinary results and enhance the quality of their lives through our proprietary technology.</p>
            </div>
            <div className="stat-item">
              <h3>Individualized Impact</h3>
              <p>Designed to make a unique difference for each participant, independent surveys show <em>"94% of participants agree The Compassion Course made a profound and lasting difference in their lives."</em></p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="programs">
        <div className="container">
          <h2 className="section-title">After The Compassion Course - A World of Possibilities</h2>
          <p className="section-description">
            Discover a world of possibilities where you continue to expand your power, effectiveness, and self-expression; where you can make a difference; or where you can participate with our Global Community – delivered in various formats and all designed to empower you to impact what you care about most.
          </p>
          
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
          <h2 className="section-title">What People Say</h2>
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

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>About the Compassion Course</h2>
              <p>Changing Lives for 14 Years, with more than 30,000 Participants, in over 120 Countries, in 20 Languages.</p>
              <div className="about-stats">
                <div className="stat">
                  <h3>30,000+</h3>
                  <p>Participants</p>
                </div>
                <div className="stat">
                  <h3>120+</h3>
                  <p>Countries</p>
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
            <h2>Ready to Transform Your Life?</h2>
            <p>Join thousands of others who have discovered their potential through the Compassion Course.</p>
            <div className="cta-buttons">
              <a href="#schedule" className="btn-primary">Check out our Course Schedule</a>
              <Link to="/contact" className="btn-secondary">Contact Us Today</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
