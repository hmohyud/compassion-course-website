import React from 'react';
import Layout from '../components/Layout';
import { useContent } from '../context/ContentContext';
import { renderHTML } from '../utils/contentUtils';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ProgramsPage: React.FC = () => {
  const { getContent } = useContent();
  useScrollReveal();

  return (
    <Layout>
      <section className="programs-page">
        <div className="container">
          <h1>
            {getContent('programs-page', 'title', 'Our Programs')}
          </h1>

          {getContent('programs-page', 'subtitle') && (
            <p className="programs-page-subtitle" style={{
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-gray-500)',
              textAlign: 'center',
              marginBottom: 'var(--space-12)',
              maxWidth: '800px',
              margin: '0 auto var(--space-12)'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('programs-page', 'subtitle', '')
            )} />
          )}

          {getContent('programs-page', 'description') && (
            <div className="reveal" style={{
              maxWidth: '900px',
              margin: '0 auto var(--space-12)',
              padding: 'var(--space-8)',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-gray-100)'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('programs-page', 'description', '')
            )} />
          )}

          {/* Program Cards Section */}
          <div className="programs-grid reveal">
            {/* Program Card 1 */}
            {getContent('programs-page', 'program1-title') && (
              <div className="program-card">
                {getContent('programs-page', 'program1-icon') && (
                  <div className="program-icon">
                    <i className={getContent('programs-page', 'program1-icon', 'fas fa-graduation-cap')}></i>
                  </div>
                )}
                <h3>{getContent('programs-page', 'program1-title', '')}</h3>
                {getContent('programs-page', 'program1-description') && (
                  <p dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program1-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program1-link') && (
                  <a href={getContent('programs-page', 'program1-link-url', '#')} className="program-link">
                    {getContent('programs-page', 'program1-link', 'Learn More')}
                  </a>
                )}
              </div>
            )}

            {/* Program Card 2 */}
            {getContent('programs-page', 'program2-title') && (
              <div className="program-card">
                {getContent('programs-page', 'program2-icon') && (
                  <div className="program-icon">
                    <i className={getContent('programs-page', 'program2-icon', 'fas fa-users')}></i>
                  </div>
                )}
                <h3>{getContent('programs-page', 'program2-title', '')}</h3>
                {getContent('programs-page', 'program2-description') && (
                  <p dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program2-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program2-link') && (
                  <a href={getContent('programs-page', 'program2-link-url', '#')} className="program-link">
                    {getContent('programs-page', 'program2-link', 'Learn More')}
                  </a>
                )}
              </div>
            )}

            {/* Program Card 3 */}
            {getContent('programs-page', 'program3-title') && (
              <div className="program-card">
                {getContent('programs-page', 'program3-icon') && (
                  <div className="program-icon">
                    <i className={getContent('programs-page', 'program3-icon', 'fas fa-heart')}></i>
                  </div>
                )}
                <h3>{getContent('programs-page', 'program3-title', '')}</h3>
                {getContent('programs-page', 'program3-description') && (
                  <p dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program3-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program3-link') && (
                  <a href={getContent('programs-page', 'program3-link-url', '#')} className="program-link">
                    {getContent('programs-page', 'program3-link', 'Learn More')}
                  </a>
                )}
              </div>
            )}

            {/* Program Card 4 */}
            {getContent('programs-page', 'program4-title') && (
              <div className="program-card">
                {getContent('programs-page', 'program4-icon') && (
                  <div className="program-icon">
                    <i className={getContent('programs-page', 'program4-icon', 'fas fa-building')}></i>
                  </div>
                )}
                <h3>{getContent('programs-page', 'program4-title', '')}</h3>
                {getContent('programs-page', 'program4-description') && (
                  <p dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program4-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program4-link') && (
                  <a href={getContent('programs-page', 'program4-link-url', '#')} className="program-link">
                    {getContent('programs-page', 'program4-link', 'Learn More')}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Additional Content Sections */}
          {getContent('programs-page', 'footer-text') && (
            <div className="reveal" style={{
              marginTop: 'var(--space-16)',
              padding: 'var(--space-8)',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-gray-100)'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('programs-page', 'footer-text', '')
            )} />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProgramsPage;
