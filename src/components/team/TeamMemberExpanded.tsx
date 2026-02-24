import React, { useState } from 'react';
import { TeamMember } from '../../services/contentService';
import { highlightMatch } from './highlightMatch';

interface TeamMemberExpandedProps {
  member: TeamMember;
  searchQuery?: string;
}

const FALLBACK_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ccircle cx=%2750%27 cy=%2735%27 r=%2720%27 fill=%27%23cbd5e1%27/%3E%3Ccircle cx=%2750%27 cy=%27100%27 r=%2735%27 fill=%27%23cbd5e1%27/%3E%3C/svg%3E';

const renderBio = (bio: string | string[]): React.ReactNode => {
  if (Array.isArray(bio)) {
    return bio.map((paragraph, index) => <p key={index}>{paragraph}</p>);
  }
  const paragraphs = bio.split('\n').filter((p) => p.trim());
  if (paragraphs.length > 1) {
    return paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>);
  }
  return <p>{bio}</p>;
};

const CopyEmailBtn: React.FC<{ email: string }> = ({ email }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      className="team-email-copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy email'}
      aria-label={copied ? 'Copied!' : 'Copy email'}
    >
      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
    </button>
  );
};

const TeamMemberExpanded: React.FC<TeamMemberExpandedProps> = ({ member, searchQuery = '' }) => {
  return (
    <article className="team-expanded">
      <div className="team-expanded__sidebar">
        <img
          src={member.photo || FALLBACK_AVATAR}
          alt={member.name}
          className="team-expanded__photo"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
        />
        {member.contact && (
          <span className="team-expanded__contact-wrap">
            <a href={`mailto:${member.contact}`} className="team-expanded__contact">
              <i className="fas fa-envelope"></i> {member.contact}
            </a>
            <CopyEmailBtn email={member.contact} />
          </span>
        )}
      </div>
      <div className="team-expanded__body">
        <h3 className="team-expanded__name">{highlightMatch(member.name, searchQuery)}</h3>
        {member.role && <p className="team-expanded__role">{highlightMatch(member.role, searchQuery)}</p>}
        <div className="team-expanded__bio">
          {renderBio(member.bio)}
        </div>
      </div>
    </article>
  );
};

export default TeamMemberExpanded;
