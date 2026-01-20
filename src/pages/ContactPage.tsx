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
      <section className="contact-page" style={{ padding: '180px 0 60px', minHeight: '100vh', background: '#f9fafb' }}>
        <div className="container">
          <h1 style={{ 
            fontSize: '3rem', 
            color: '#002B4D', 
            textAlign: 'center', 
            marginBottom: '1rem' 
          }}>
            {getContent('contact-page', 'title', 'Contact Us')}
          </h1>
          
          {getContent('contact-page', 'subtitle') && (
            <p style={{ 
              fontSize: '1.25rem', 
              color: '#6b7280', 
              textAlign: 'center', 
              marginBottom: '3rem',
              maxWidth: '800px',
              margin: '0 auto 3rem'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('contact-page', 'subtitle', '')
            )} />
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {/* Contact Information */}
            <div>
              {getContent('contact-page', 'description') && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '2rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }} dangerouslySetInnerHTML={renderHTML(
                  getContent('contact-page', 'description', '')
                )} />
              )}

              {/* Contact Details */}
              <div style={{
                padding: '2rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {getContent('contact-page', 'email') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#002B4D', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#002B4D' }}></i>
                      Email
                    </h3>
                    <a 
                      href={`mailto:${getContent('contact-page', 'email', '')}`}
                      style={{ color: '#6b7280', textDecoration: 'none' }}
                    >
                      {getContent('contact-page', 'email', '')}
                    </a>
                  </div>
                )}

                {getContent('contact-page', 'phone') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#002B4D', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      <i className="fas fa-phone" style={{ marginRight: '0.5rem', color: '#002B4D' }}></i>
                      Phone
                    </h3>
                    <a 
                      href={`tel:${getContent('contact-page', 'phone', '')}`}
                      style={{ color: '#6b7280', textDecoration: 'none' }}
                    >
                      {getContent('contact-page', 'phone', '')}
                    </a>
                  </div>
                )}

                {getContent('contact-page', 'address') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#002B4D', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem', color: '#002B4D' }}></i>
                      Address
                    </h3>
                    <p style={{ color: '#6b7280', margin: 0 }} dangerouslySetInnerHTML={renderHTML(
                      getContent('contact-page', 'address', '')
                    )} />
                  </div>
                )}

                {getContent('contact-page', 'hours') && (
                  <div>
                    <h3 style={{ color: '#002B4D', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      <i className="fas fa-clock" style={{ marginRight: '0.5rem', color: '#002B4D' }}></i>
                      Office Hours
                    </h3>
                    <p style={{ color: '#6b7280', margin: 0 }} dangerouslySetInnerHTML={renderHTML(
                      getContent('contact-page', 'hours', '')
                    )} />
                  </div>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div style={{
                padding: '2rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ color: '#002B4D', marginBottom: '1.5rem' }}>
                  {getContent('contact-page', 'form-title', 'Send us a Message')}
                </h2>
                
                {submitted ? (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    {getContent('contact-page', 'form-success-message', 'Thank you! Your message has been sent.')}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="name" style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="email" style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="subject" style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="message" style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      {getContent('contact-page', 'form-button-text', 'Send Message')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Additional Content */}
          {getContent('contact-page', 'footer-text') && (
            <div style={{
              marginTop: '4rem',
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '900px',
              margin: '4rem auto 0'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('contact-page', 'footer-text', '')
            )} />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
