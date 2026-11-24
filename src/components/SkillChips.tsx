import type { Skill } from '../types';
import { focusSkills, sortByFocus } from '../lib/content';

interface SkillChipsProps {
  ids: string[];
  skills: Skill[];
  limit?: number;
  onSkillClick?: (id: string) => void;
}

export default function SkillChips({ ids, skills, limit, onSkillClick }: SkillChipsProps) {
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const sorted = sortByFocus(ids);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <ul className="chip-list" aria-label="Skills">
      {shown.map((id) => {
        const skill = skillById.get(id);
        if (!skill) return null;
        const focus = focusSkills.has(id);
        const className = `chip${focus ? ' chip--focus' : ''}`;
        const label = (
          <>
            {focus && <span aria-hidden="true">✦</span>}
            {skill.label}
            {focus && <span className="sr-only"> (current focus)</span>}
          </>
        );
        return (
          <li key={id}>
            {onSkillClick ? (
              <button type="button" className={`${className} chip--button`} onClick={() => onSkillClick(id)}>{label}</button>
            ) : (
              <span className={className}>{label}</span>
            )}
          </li>
        );
      })}
      {limit && sorted.length > limit && (
        <li><span className="chip chip--more">+{sorted.length - limit}</span></li>
      )}
    </ul>
  );
}
