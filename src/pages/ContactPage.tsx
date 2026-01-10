import React from 'react';
import Layout from '../components/Layout';

const ContactPage: React.FC = () => {
  return (
    <Layout>
      <section className="contact-page">
        <div className="container">
          <h1>Contact Us</h1>
          <p>Get in touch with the Compassion Course team.</p>
          {/* Add contact form here */}
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
