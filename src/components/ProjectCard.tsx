import type { MouseEvent } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import type { Course, Project, Skill } from '../types';
import type { Theme } from '../lib/theme';
import SkillChips from './SkillChips';
import { ExternalIcon, GraphIcon } from './icons';

interface ProjectCardProps {
  project: Project;
  skills: Skill[];
  course?: Course;
  onOpenInGraph: (id: string, origin: { x: number; y: number }) => void;
  /** Freezes the "working" orb beside Explore in graph. */
  reducedMotion: boolean;
  theme: Theme;
}

/** The orb is a canvas, so it can't read CSS: these match --mint in each theme (tokens.css). */
const ORB_INK: Record<Theme, string> = { dark: '#8bf5c8', light: '#2b7356' };

export default function ProjectCard({ project, skills, course, onOpenInGraph, reducedMotion, theme }: ProjectCardProps) {
  const primaryUrl = project.githubUrl ?? project.pdfUrl;
  const primaryLabel = project.githubUrl ? 'Open GitHub' : 'Open PDF';
  const hasBothLinks = Boolean(project.githubUrl && project.pdfUrl);

  const openGraph = (event: MouseEvent<HTMLButtonElement>) => {
    onOpenInGraph(project.id, { x: event.clientX, y: event.clientY });
  };

  return (
    <article className="project-card">
      {primaryUrl ? (
        <a
          className="project-card__hit"
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${project.title}: ${primaryLabel} (opens in a new tab)`}
        />
      ) : (
        <button
          type="button"
          className="project-card__hit"
          aria-label={`${project.title}: explore in the knowledge graph`}
          onClick={openGraph}
        />
      )}
      <div className="project-card__top">
        <span className="mono">{project.kind === 'poc' ? 'Proof of concept' : project.experienceId ? 'Work project' : [course?.code, project.team].filter(Boolean).join(', ') || 'Academic project'}</span>
        <span className="project-card__icon" aria-hidden="true">{primaryUrl ? <ExternalIcon /> : <GraphIcon />}</span>
      </div>
      <h3>{project.title}</h3>
      <p className="project-card__summary">{project.summary}</p>
      <div className="project-card__footer">
        <SkillChips ids={project.skills} skills={skills} limit={4} />
        {hasBothLinks ? (
          <span className="project-card__links">
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <ExternalIcon /></a>
            <a href={project.pdfUrl} target="_blank" rel="noopener noreferrer">PDF <ExternalIcon /></a>
          </span>
        ) : (
          <span className="project-card__action">
            {primaryUrl ? <>{primaryLabel} <ExternalIcon /></> : (
              <>
                <ThinkingOrb className="project-card__orb" state="working" size={64} theme={theme} color={ORB_INK[theme]} paused={reducedMotion} aria-hidden="true" />
                 Explore in graph
              </>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
