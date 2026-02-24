import React, { useState, useMemo } from 'react';
import { TeamMember, TeamLanguageSection } from '../../services/contentService';
import { ensureTeamSuffix } from '../../utils/contentUtils';
import { GUEST_TRAINER_SECTION } from '../../hooks/useTeamData';
import { ViewMode } from './ViewToggle';
import TeamMemberCard from './TeamMemberCard';
import TeamMemberRow from './TeamMemberRow';
import TeamMemberCompact from './TeamMemberCompact';
import TeamMemberExpanded from './TeamMemberExpanded';

interface TeamGridProps {
  sections: TeamLanguageSection[];
  membersBySection: Record<string, TeamMember[]>;
  viewMode: ViewMode;
  activeSection: string | null;
  searchQuery: string;
  onSelectMember: (member: TeamMember) => void;
}

const TeamGrid: React.FC<TeamGridProps> = ({
  sections,
  membersBySection,
  viewMode,
  activeSection,
  searchQuery,
  onSelectMember,
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleSection = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Filter sections to display
  const visibleSections = useMemo(() => {
    if (activeSection) {
      return sections.filter((s) => s.name === activeSection);
    }
    return sections;
  }, [sections, activeSection]);

  // Get members for a section, applying search filter
  const getMembersForSection = (sectionName: string): TeamMember[] => {
    const normalized = ensureTeamSuffix(sectionName);
    const members = [
      ...(membersBySection[sectionName] ?? []),
      ...(sectionName !== normalized ? (membersBySection[normalized] ?? []) : []),
    ];

    if (!searchQuery.trim()) return members;

    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role?.toLowerCase().includes(q))
    );
  };

  const renderMember = (member: TeamMember) => {
    const q = searchQuery.trim();
    switch (viewMode) {
      case 'list':
        return <TeamMemberRow key={member.id ?? member.name} member={member} onSelect={onSelectMember} searchQuery={q} />;
      case 'compact':
        return <TeamMemberCompact key={member.id ?? member.name} member={member} onSelect={onSelectMember} searchQuery={q} />;
      case 'expanded':
        return <TeamMemberExpanded key={member.id ?? member.name} member={member} searchQuery={q} />;
      default:
        return <TeamMemberCard key={member.id ?? member.name} member={member} onSelect={onSelectMember} searchQuery={q} />;
    }
  };

  const gridClass = `team-grid team-grid--${viewMode}`;

  return (
    <div className="team-sections">
      {visibleSections.map((section) => {
        const members = getMembersForSection(section.name);
        if (members.length === 0) return null;
        const isCollapsed = collapsed.has(section.name);
        const isGuest = section.name === GUEST_TRAINER_SECTION;

        return (
          <div key={section.name} className={`team-section ${isGuest ? 'team-section--guest' : ''}`}>
            <button
              className="team-section__header"
              onClick={() => toggleSection(section.name)}
              aria-expanded={!isCollapsed}
            >
              {isGuest && <i className="fas fa-star team-section__guest-icon"></i>}
              <h3 className="team-section__title">{section.name}</h3>
              <span className="team-section__count">{members.length}</span>
              <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} team-section__chevron`}></i>
            </button>
            {!isCollapsed && (
              <div className={gridClass}>
                {members.map(renderMember)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TeamGrid;
