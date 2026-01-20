import React from 'react';
import Layout from '../components/Layout';
import { useContent } from '../context/ContentContext';
import { renderHTML } from '../utils/contentUtils';

const ProgramsPage: React.FC = () => {
  const { getContent } = useContent();

  return (
    <Layout>
      <section className="programs-page" style={{ padding: '180px 0 60px', minHeight: '100vh', background: '#f9fafb' }}>
        <div className="container">
          <h1 style={{ 
            fontSize: '3rem', 
            color: '#002B4D', 
            textAlign: 'center', 
            marginBottom: '2rem' 
          }}>
            {getContent('programs-page', 'title', 'Our Programs')}
          </h1>
          
          {getContent('programs-page', 'subtitle') && (
            <p style={{ 
              fontSize: '1.25rem', 
              color: '#6b7280', 
              textAlign: 'center', 
              marginBottom: '3rem',
              maxWidth: '800px',
              margin: '0 auto 3rem'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('programs-page', 'subtitle', '')
            )} />
          )}

          {getContent('programs-page', 'description') && (
            <div style={{ 
              maxWidth: '900px',
              margin: '0 auto 3rem',
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }} dangerouslySetInnerHTML={renderHTML(
              getContent('programs-page', 'description', '')
            )} />
          )}

          {/* Program Cards Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            marginTop: '3rem'
          }}>
            {/* Program Card 1 */}
            {getContent('programs-page', 'program1-title') && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease',
              }}>
                {getContent('programs-page', 'program1-icon') && (
                  <div style={{ fontSize: '3rem', color: '#002B4D', marginBottom: '1rem' }}>
                    <i className={getContent('programs-page', 'program1-icon', 'fas fa-graduation-cap')}></i>
                  </div>
                )}
                <h3 style={{ color: '#002B4D', marginBottom: '1rem' }}>
                  {getContent('programs-page', 'program1-title', '')}
                </h3>
                {getContent('programs-page', 'program1-description') && (
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program1-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program1-link') && (
                  <a 
                    href={getContent('programs-page', 'program1-link-url', '#')} 
                    style={{ 
                      color: '#002B4D', 
                      textDecoration: 'none',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '1rem'
                    }}
                  >
                    {getContent('programs-page', 'program1-link', 'Learn More')} →
                  </a>
                )}
              </div>
            )}

            {/* Program Card 2 */}
            {getContent('programs-page', 'program2-title') && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease',
              }}>
                {getContent('programs-page', 'program2-icon') && (
                  <div style={{ fontSize: '3rem', color: '#002B4D', marginBottom: '1rem' }}>
                    <i className={getContent('programs-page', 'program2-icon', 'fas fa-users')}></i>
                  </div>
                )}
                <h3 style={{ color: '#002B4D', marginBottom: '1rem' }}>
                  {getContent('programs-page', 'program2-title', '')}
                </h3>
                {getContent('programs-page', 'program2-description') && (
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program2-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program2-link') && (
                  <a 
                    href={getContent('programs-page', 'program2-link-url', '#')} 
                    style={{ 
                      color: '#002B4D', 
                      textDecoration: 'none',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '1rem'
                    }}
                  >
                    {getContent('programs-page', 'program2-link', 'Learn More')} →
                  </a>
                )}
              </div>
            )}

            {/* Program Card 3 */}
            {getContent('programs-page', 'program3-title') && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease',
              }}>
                {getContent('programs-page', 'program3-icon') && (
                  <div style={{ fontSize: '3rem', color: '#002B4D', marginBottom: '1rem' }}>
                    <i className={getContent('programs-page', 'program3-icon', 'fas fa-heart')}></i>
                  </div>
                )}
                <h3 style={{ color: '#002B4D', marginBottom: '1rem' }}>
                  {getContent('programs-page', 'program3-title', '')}
                </h3>
                {getContent('programs-page', 'program3-description') && (
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program3-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program3-link') && (
                  <a 
                    href={getContent('programs-page', 'program3-link-url', '#')} 
                    style={{ 
                      color: '#002B4D', 
                      textDecoration: 'none',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '1rem'
                    }}
                  >
                    {getContent('programs-page', 'program3-link', 'Learn More')} →
                  </a>
                )}
              </div>
            )}

            {/* Program Card 4 */}
            {getContent('programs-page', 'program4-title') && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease',
              }}>
                {getContent('programs-page', 'program4-icon') && (
                  <div style={{ fontSize: '3rem', color: '#002B4D', marginBottom: '1rem' }}>
                    <i className={getContent('programs-page', 'program4-icon', 'fas fa-building')}></i>
                  </div>
                )}
                <h3 style={{ color: '#002B4D', marginBottom: '1rem' }}>
                  {getContent('programs-page', 'program4-title', '')}
                </h3>
                {getContent('programs-page', 'program4-description') && (
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderHTML(
                    getContent('programs-page', 'program4-description', '')
                  )} />
                )}
                {getContent('programs-page', 'program4-link') && (
                  <a 
                    href={getContent('programs-page', 'program4-link-url', '#')} 
                    style={{ 
                      color: '#002B4D', 
                      textDecoration: 'none',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '1rem'
                    }}
                  >
                    {getContent('programs-page', 'program4-link', 'Learn More')} →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Additional Content Sections */}
          {getContent('programs-page', 'footer-text') && (
            <div style={{
              marginTop: '4rem',
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              textAlign: 'center'
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
