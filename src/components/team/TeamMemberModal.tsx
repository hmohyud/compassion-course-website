import React, { useEffect, useRef, useState } from 'react';
import { TeamMember } from '../../services/contentService';

interface TeamMemberModalProps {
  member: TeamMember;
  onClose: () => void;
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

const CopyEmail: React.FC<{ email: string }> = ({ email }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <span className="team-modal__contact-wrap">
      <a href={`mailto:${email}`} className="team-modal__contact">
        <i className="fas fa-envelope"></i> {email}
      </a>
      <button
        type="button"
        className="team-email-copy-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy email'}
        aria-label={copied ? 'Copied!' : 'Copy email'}
      >
        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      </button>
    </span>
  );
};

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({ member, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    // Focus the dialog
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div
        className="team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-name"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="team-modal__close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times"></i>
        </button>
        <div className="team-modal__header">
          <img
            src={member.photo || FALLBACK_AVATAR}
            alt={member.name}
            className="team-modal__photo"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
          />
          <div>
            <h2 id="team-modal-name" className="team-modal__name">{member.name}</h2>
            {member.role && <p className="team-modal__role">{member.role}</p>}
            {member.contact && (
              <CopyEmail email={member.contact} />
            )}
          </div>
        </div>
        <div className="team-modal__bio">
          {renderBio(member.bio)}
        </div>
      </div>
    </div>
  );
};

export default TeamMemberModal;
