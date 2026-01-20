import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getTeamMembers, TeamMember } from '../services/contentService';

const AboutPage: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setLoading(true);
        const members = await getTeamMembers();
        setTeamMembers(members);
      } catch (err: any) {
        console.error('Error loading team members:', err);
        setError('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  // Group team members by team section
  const membersBySection: { [key: string]: TeamMember[] } = {};
  teamMembers.forEach(member => {
    if (!membersBySection[member.teamSection]) {
      membersBySection[member.teamSection] = [];
    }
    membersBySection[member.teamSection].push(member);
  });

  // Sort sections and members within sections
  const sortedSections = Object.keys(membersBySection).sort();
  sortedSections.forEach(section => {
    membersBySection[section].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

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
        <div className="container">
          <h1>About the Compassion Course</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '3rem', textAlign: 'center' }}>
            Changing Lives for 14 Years, with more than 30,000 Participants, in over 120 Countries, in 20 Languages.
          </p>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading team members...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {!loading && !error && sortedSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No team members found. Please add team members through the admin panel.
            </div>
          )}

          {!loading && !error && sortedSections.map((sectionName) => (
            <div key={sectionName} className="team-section">
              <h2 className="team-section-title">{sectionName}</h2>
              
              {membersBySection[sectionName].map((member) => (
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
                    <p><strong>Contact:</strong> {member.contact}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default AboutPage;
