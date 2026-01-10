import React from 'react';
import Layout from '../components/Layout';

const AboutPage: React.FC = () => {
  return (
    <Layout>
      <section className="about-page">
        <div className="container">
          <h1>About the Compassion Course</h1>
          <p>Changing Lives for 14 Years, with more than 30,000 Participants, in over 120 Countries, in 20 Languages.</p>
          {/* Add more content here */}
        </div>
      </section>
    </Layout>
  );
};

export default AboutPage;
