import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getTeamMembers, getLanguageSections, TeamMember, TeamLanguageSection } from '../services/contentService';
import { ensureTeamSuffix } from '../utils/contentUtils';
import { isFirebaseConfigured } from '../firebase/firebaseConfig';

const AboutPage: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [languageSections, setLanguageSections] = useState<TeamLanguageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        const [members, sections] = await Promise.all([
          getTeamMembers(),
          getLanguageSections()
        ]);
        if (!cancelled) {
          setTeamMembers(members);
          setLanguageSections(sections);
        }
      } catch (err: any) {
        console.error('Error loading team data:', err);
        if (!cancelled) setError('Failed to load team information');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Group team members by team section
  const membersBySection: { [key: string]: TeamMember[] } = {};
  teamMembers.forEach(member => {
    if (!membersBySection[member.teamSection]) {
      membersBySection[member.teamSection] = [];
    }
    membersBySection[member.teamSection].push(member);
  });

  // Sort members within each section
  Object.keys(membersBySection).forEach(section => {
    membersBySection[section].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  // Use language sections order, filter to only sections that have members or are explicitly shown
  const sortedSections = languageSections
    .filter(section => {
      // Check both original and normalized names for backward compatibility
      const normalizedName = ensureTeamSuffix(section.name);
      const hasMembers = (membersBySection[section.name] && membersBySection[section.name].length > 0) ||
                         (membersBySection[normalizedName] && membersBySection[normalizedName].length > 0);
      return hasMembers;
    })
    .map(section => section.name);

  const renderBio = (bio: string | string[]): React.ReactNode => {
    if (Array.isArray(bio)) {
      return bio.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ));
    }
    // If bio is a string, split by newlines or return as single paragraph
    const paragraphs = bio.split('\n').filter(p => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ));
    }
    return <p>{bio}</p>;
  };

  return (
    <Layout>
      <section className="about-page">
        <div className="about-page-hero">
          <h1>About the Compassion Course</h1>
          <p className="about-page-subtitle">
            Changing Lives for 14 Years, with more than 30,000 Participants, in over 120 Countries, in 20 Languages.
          </p>
        </div>

        <div className="container">
          {loading && (
            <div className="about-loading">
              <div className="about-loading-spinner"></div>
              <p>Loading team members...</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {!loading && !error && isFirebaseConfigured && languageSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No language sections found. Please add language sections through the admin panel.
            </div>
          )}

          {!loading && !error && isFirebaseConfigured && languageSections.length > 0 && sortedSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Language sections exist but no team members found. Please add team members through the admin panel.
            </div>
          )}

          {!loading && !error && sortedSections.map((sectionName) => {
            // Get members for this section (check both original and normalized names)
            const normalizedName = ensureTeamSuffix(sectionName);
            const sectionMembers = membersBySection[sectionName] || membersBySection[normalizedName] || [];

            return (
            <div key={sectionName} className="team-section">
              <h2 className="team-section-title">{ensureTeamSuffix(sectionName)}</h2>

              {sectionMembers.map((member) => (
                <div key={member.id} className="team-member">
                  <div className="team-member-header">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="team-member-photo"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Failed to load image:', e.currentTarget.src);
                        e.currentTarget.style.border = '2px solid red';
                        e.currentTarget.alt = 'Image failed to load: ' + e.currentTarget.src;
                      }}
                    />
                    <div className="team-member-info">
                      <h3>{member.name}</h3>
                      {member.role && (
                        <p className="team-role"><em>{member.role}</em></p>
                      )}
                    </div>
                  </div>
                  {renderBio(member.bio)}
                  {member.contact && (
                    <p className="team-member-contact-line">
                      <strong>Contact:</strong> {member.contact}
                    </p>
                  )}
                </div>
              ))}
            </div>
            );
          })}
        </div>
      </section>
    </Layout>
  );
};

export default AboutPage;
