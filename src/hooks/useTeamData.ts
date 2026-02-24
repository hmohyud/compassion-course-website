import { useState, useEffect, useMemo } from 'react';
import { getTeamMembers, getLanguageSections, TeamMember, TeamLanguageSection } from '../services/contentService';
import { ensureTeamSuffix } from '../utils/contentUtils';
import { siteContent } from '../data/siteContent';

export const GUEST_TRAINER_SECTION = 'Guest Trainers';

export interface UseTeamDataReturn {
  guestTrainers: TeamMember[];
  regularSections: TeamLanguageSection[];
  allSections: TeamLanguageSection[];
  membersBySection: Record<string, TeamMember[]>;
  loading: boolean;
  error: string | null;
}

export function useTeamData(): UseTeamDataReturn {
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
          getLanguageSections(),
        ]);
        if (!cancelled) {
          setTeamMembers(members);
          setLanguageSections(sections);
        }
      } catch (err: any) {
        console.error('Error loading team data:', err);
        if (!cancelled) {
          setError('Failed to load team information');
          // Fall back to static data from siteContent
          const staticMembers: TeamMember[] = [];
          const staticSections: TeamLanguageSection[] = [];

          siteContent.about.team.sections.forEach((section, sIdx) => {
            const sectionName = section.title;
            staticSections.push({
              name: sectionName,
              order: sIdx,
              isActive: true,
            });
            section.members.forEach((member, mIdx) => {
              staticMembers.push({
                name: member.name,
                role: member.role,
                bio: Array.isArray(member.bio) ? member.bio.join('\n') : member.bio,
                photo: member.photo,
                contact: member.contact,
                teamSection: sectionName,
                order: mIdx,
                isActive: true,
              });
            });
          });

          setTeamMembers(staticMembers);
          setLanguageSections(staticSections);
          setError(null); // Clear error since we have fallback data
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  const { guestTrainers, regularSections, allSections, membersBySection } = useMemo(() => {
    // Sort by explicit order first, then fall back to createdAt (date added)
    const sortMembers = (a: TeamMember, b: TeamMember) => {
      const aOrder = a.order ?? Infinity;
      const bOrder = b.order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Fallback: sort by createdAt (newest last)
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    };

    // Separate guest trainers (kept for backward compat)
    const guests: TeamMember[] = [];

    teamMembers.forEach((member) => {
      if (member.teamSection === GUEST_TRAINER_SECTION) {
        guests.push(member);
      }
    });
    guests.sort(sortMembers);

    // Group ALL members by section (including guest trainers)
    const grouped: Record<string, TeamMember[]> = {};
    teamMembers.forEach((member) => {
      const key = member.teamSection;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(member);
    });

    // Sort within each section by order, then createdAt
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(sortMembers);
    });

    // Regular sections (excluding guest trainers)
    const regSections = languageSections
      .filter((s) => s.name !== GUEST_TRAINER_SECTION)
      .filter((s) => {
        const name = s.name;
        const normalized = ensureTeamSuffix(name);
        return (grouped[name]?.length > 0) || (grouped[normalized]?.length > 0);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // All sections (including guest trainers — guest trainers pinned first)
    const allSects = languageSections
      .filter((s) => {
        const name = s.name;
        const normalized = ensureTeamSuffix(name);
        return (grouped[name]?.length > 0) || (grouped[normalized]?.length > 0);
      })
      .sort((a, b) => {
        // Guest Trainers always come first
        if (a.name === GUEST_TRAINER_SECTION) return -1;
        if (b.name === GUEST_TRAINER_SECTION) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });

    return {
      guestTrainers: guests,
      regularSections: regSections,
      allSections: allSects,
      membersBySection: grouped,
    };
  }, [teamMembers, languageSections]);

  return { guestTrainers, regularSections, allSections, membersBySection, loading, error };
}
