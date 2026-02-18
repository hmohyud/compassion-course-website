import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useContent } from '../context/ContentContext';
import { renderHTML } from '../utils/contentUtils';

const ContactPage: React.FC = () => {
  const { getContent } = useContent();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission to backend/Firebase
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Layout>
      <section className="contact-page">
        <div className="container">
          <h1>{getContent('contact-page', 'title', 'Contact Us')}</h1>

          {getContent('contact-page', 'subtitle') && (
            <p className="section-description" dangerouslySetInnerHTML={renderHTML(
              getContent('contact-page', 'subtitle', '')
            )} />
          )}

          <div className="contact-grid">
            {/* Contact Information */}
            <div>
              {getContent('contact-page', 'description') && (
                <div className="contact-card" style={{ marginBottom: 'var(--space-6)' }}
                  dangerouslySetInnerHTML={renderHTML(getContent('contact-page', 'description', ''))}
                />
              )}

              <div className="contact-card">
                {getContent('contact-page', 'email') && (
                  <div className="contact-info-item">
                    <h3><i className="fas fa-envelope"></i> Email</h3>
                    <a href={`mailto:${getContent('contact-page', 'email', '')}`}>
                      {getContent('contact-page', 'email', '')}
                    </a>
                  </div>
                )}

                {getContent('contact-page', 'phone') && (
                  <div className="contact-info-item">
                    <h3><i className="fas fa-phone"></i> Phone</h3>
                    <a href={`tel:${getContent('contact-page', 'phone', '')}`}>
                      {getContent('contact-page', 'phone', '')}
                    </a>
                  </div>
                )}

                {getContent('contact-page', 'address') && (
                  <div className="contact-info-item">
                    <h3><i className="fas fa-map-marker-alt"></i> Address</h3>
                    <p dangerouslySetInnerHTML={renderHTML(getContent('contact-page', 'address', ''))} />
                  </div>
                )}

                {getContent('contact-page', 'hours') && (
                  <div className="contact-info-item">
                    <h3><i className="fas fa-clock"></i> Office Hours</h3>
                    <p dangerouslySetInnerHTML={renderHTML(getContent('contact-page', 'hours', ''))} />
                  </div>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-card">
              <h2>{getContent('contact-page', 'form-title', 'Send us a Message')}</h2>

              {submitted ? (
                <div className="contact-success">
                  {getContent('contact-page', 'form-success-message', 'Thank you! Your message has been sent.')}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="contact-form-group">
                    <label htmlFor="name">Name *</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="email">Email *</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="subject">Subject *</label>
                    <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea id="message" name="message" value={formData.message} onChange={handleChange} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    {getContent('contact-page', 'form-button-text', 'Send Message')}
                  </button>
                </form>
              )}
            </div>
          </div>

          {getContent('contact-page', 'footer-text') && (
            <div className="contact-card" style={{ marginTop: 'var(--space-12)', maxWidth: '900px', margin: 'var(--space-12) auto 0', textAlign: 'center' }}
              dangerouslySetInnerHTML={renderHTML(getContent('contact-page', 'footer-text', ''))}
            />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
