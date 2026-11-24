import type { Skill } from '../types';
import { content, focusSkills, sortByFocus } from '../lib/content';

/**
 * The marquee shows a curated set rather than all ~70 skills: focus skills, the role's top skills,
 * and any skill used in two or more projects. Niche one-off skills stay in the graph and cards.
 */
function featuredSkillIds(skills: Skill[]): string[] {
  const projectUse = new Map<string, number>();
  for (const project of content.projects) {
    for (const id of project.skills) projectUse.set(id, (projectUse.get(id) ?? 0) + 1);
  }
  const top = new Set(content.experience.flatMap((role) => role.topSkills ?? []));
  return skills
    .filter((skill) => focusSkills.has(skill.id) || top.has(skill.id) || (projectUse.get(skill.id) ?? 0) >= 2)
    .map((skill) => skill.id);
}

/** Two counter-scrolling rows of every skill. Decorative; the skills are listed accessibly elsewhere. */
export default function SkillMarquee({ skills }: { skills: Skill[] }) {
  const ordered = sortByFocus(featuredSkillIds(skills)).map((id) => skills.find((skill) => skill.id === id)!);
  const half = Math.ceil(ordered.length / 2);
  const rows = [ordered.slice(0, half), ordered.slice(half)];

  return (
    <div className="marquee" aria-hidden="true">
      {rows.map((row, index) => (
        <div key={index} className={`marquee__row${index === 1 ? ' marquee__row--reverse' : ''}`}>
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee__track">
              {row.map((skill) => (
                <span key={skill.id} className={`marquee__item${focusSkills.has(skill.id) ? ' marquee__item--focus' : ''}`}>
                  {focusSkills.has(skill.id) ? '✦ ' : ''}{skill.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
