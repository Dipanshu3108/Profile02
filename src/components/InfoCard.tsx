import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import type { Content } from '../types';
import type { GraphData, GraphNode } from '../lib/graph';
import SkillChips from './SkillChips';
import CopyEmail from './CopyEmail';

interface InfoCardProps {
  content: Content;
  graph: GraphData;
  nodeId: string | null;
  onJump: (id: string) => void;
  onClear: () => void;
}

/** Puts the role's chosen top skills first, then the rest in source order. */
function orderByTop(ids: string[], top: string[] = []): string[] {
  const topSet = new Set(top);
  return [...top.filter((id) => ids.includes(id)), ...ids.filter((id) => !topSet.has(id))];
}

function Highlights({ items }: { items: string[] }) {
  return <ul className="highlight-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function NodeLinks({ nodes, onJump, label = 'Connections' }: { nodes: GraphNode[]; onJump: (id: string) => void; label?: string }) {
  if (nodes.length === 0) return null;
  return (
    <div className="info-connections">
      <h3>{label}</h3>
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <button type="button" className="connection-link" onClick={() => onJump(node.id)}>
              {node.fullLabel}
            </button>
            <span className={`info-connections__type info-connections__type--${node.type}`}>{node.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExternalLinks({ githubUrl, pdfUrl }: { githubUrl?: string; pdfUrl?: string }) {
  if (!githubUrl && !pdfUrl) return null;
  return (
    <div className="info-actions">
      {githubUrl && <a className="button button--primary" href={githubUrl} target="_blank" rel="noopener noreferrer">Open GitHub <span aria-hidden="true">↗</span></a>}
      {pdfUrl && <a className="button button--ghost" href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF <span aria-hidden="true">↗</span></a>}
    </div>
  );
}

export default function InfoCard({ content, graph, nodeId, onJump, onClear }: InfoCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const drag = useRef<{ startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const node = nodeId ? graph.nodeById.get(nodeId) : undefined;
  const connected = node
    ? [...(graph.neighbors.get(node.id) ?? [])].map((id) => graph.nodeById.get(id)).filter((item): item is GraphNode => Boolean(item))
    : [];

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = { startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const delta = event.clientY - drag.current.startY;
    if (Math.abs(delta) > 7) drag.current.moved = true;
    setDragOffset(expanded ? Math.max(-28, delta) : Math.min(28, delta));
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const delta = event.clientY - drag.current.startY;
    const wasClick = event.type === 'pointerup' && !drag.current.moved;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (expanded && delta > 70) setExpanded(false);
    if (!expanded && delta < -70) setExpanded(true);
    if (wasClick) setExpanded((current) => !current);
    drag.current = null;
    setDragOffset(null);
  };

  let body: ReactNode;
  if (!node) {
    body = (
      <div className="info-empty">
        <ThinkingOrb state="breathing" size={64} theme="auto" />
        <p className="info-empty__title">Select a node to see details.</p>
        <p>Shapes are types and lines are connections. Drag to orbit, scroll to zoom.</p>
      </div>
    );
  } else if (node.type === 'profile') {
    body = (
      <>
        <p className="info-kicker">Profile</p>
        <h2>{content.profile.name}</h2>
        <p className="info-lede">{content.profile.headline}</p>
        {content.profile.about.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
        <NodeLinks nodes={connected} onJump={onJump} />
      </>
    );
  } else if (node.type === 'experience') {
    const role = content.experience.find((item) => item.id === node.id);
    if (!role) return null;
    body = (
      <>
        <p className="info-kicker">Experience</p>
        <h2>{role.role}</h2>
        <p className="info-lede">{role.organization}</p>
        <p className="date-range">{role.start} to {role.end}{role.location ? `, ${role.location}` : ''}</p>
        <Highlights items={role.highlights} />
        <h3>Skills</h3>
        <SkillChips ids={orderByTop(role.skills, role.topSkills)} skills={content.skills} onSkillClick={onJump} />
        <NodeLinks nodes={connected.filter((item) => item.type === 'project')} onJump={onJump} label="Projects and proofs of concept" />
      </>
    );
  } else if (node.type === 'education') {
    const education = content.education.find((item) => item.id === node.id);
    if (!education) return null;
    body = (
      <>
        <p className="info-kicker">Education</p>
        <h2>{education.degree}</h2>
        <p className="info-lede">{education.institution}</p>
        <p className="date-range">{education.start} to {education.end}{education.gpa ? `, GPA ${education.gpa}` : ''}</p>
        {education.notes && <p>{education.notes}</p>}
        {(education.honors?.length || education.activities?.length) ? (
          <Highlights items={[...(education.honors ?? []), ...(education.activities ?? [])]} />
        ) : null}
        <NodeLinks nodes={connected.filter((item) => item.type === 'course')} onJump={onJump} label="Courses" />
        <NodeLinks nodes={connected.filter((item) => item.type !== 'course')} onJump={onJump} />
      </>
    );
  } else if (node.type === 'project') {
    const project = content.projects.find((item) => item.id === node.id);
    if (!project) return null;
    const role = project.experienceId ? graph.nodeById.get(project.experienceId) : undefined;
    const course = content.courses?.find((item) => item.id === project.courseId);
    const courseNode = project.courseId ? graph.nodeById.get(project.courseId) : undefined;
    const degreeNode = project.educationId ? graph.nodeById.get(project.educationId) : undefined;
    const meta = [course && `${course.code}: ${course.name}`, project.team, project.year].filter(Boolean).join(', ');
    body = (
      <>
        <p className="info-kicker">{project.kind === 'poc' ? 'Proof of concept' : project.experienceId ? 'Work project' : 'Academic project'}</p>
        <h2>{project.title}</h2>
        <p className="info-lede">{project.summary}</p>
        {meta && <p className="date-range">{meta}</p>}
        <ExternalLinks githubUrl={project.githubUrl} pdfUrl={project.pdfUrl} />
        {project.highlights.length > 0 && <Highlights items={project.highlights} />}
        <h3>Skills</h3>
        <SkillChips ids={project.skills} skills={content.skills} onSkillClick={onJump} />
        {role && <NodeLinks nodes={[role]} onJump={onJump} label="Role" />}
        {courseNode && <NodeLinks nodes={[courseNode]} onJump={onJump} label="Course" />}
        {degreeNode && <NodeLinks nodes={[degreeNode]} onJump={onJump} label="Degree" />}
      </>
    );
  } else if (node.type === 'skill') {
    const category = content.skills.find((item) => item.id === node.id)?.category;
    body = (
      <>
        <p className="info-kicker">{['Skill', category, node.focus ? 'current focus' : ''].filter(Boolean).join(', ')}</p>
        <h2 className={node.focus ? 'is-focus' : undefined}>{node.focus ? '✦ ' : ''}{node.label}</h2>
        <NodeLinks nodes={connected.filter((item) => item.type === 'project')} onJump={onJump} label="Projects" />
        <NodeLinks nodes={connected.filter((item) => item.type === 'experience')} onJump={onJump} label="Roles" />
        <NodeLinks nodes={connected.filter((item) => item.type === 'skill')} onJump={onJump} label="Related skills" />
        <NodeLinks nodes={connected.filter((item) => item.type === 'certification')} onJump={onJump} label="Certifications" />
      </>
    );
  } else if (node.type === 'course') {
    const course = content.courses?.find((item) => item.id === node.id);
    if (!course) return null;
    body = (
      <>
        <p className="info-kicker">Course</p>
        <h2>{course.code}</h2>
        <p className="info-lede">{course.name}</p>
        {course.term && <p className="date-range">{course.term}</p>}
        <NodeLinks nodes={connected.filter((item) => item.type === 'education')} onJump={onJump} label="Degree" />
        <NodeLinks nodes={connected.filter((item) => item.type === 'project')} onJump={onJump} label="Projects" />
      </>
    );
  } else if (node.type === 'certification') {
    const cert = content.certifications?.find((item) => item.id === node.id);
    if (!cert) return null;
    body = (
      <>
        <p className="info-kicker">Certification</p>
        <h2>{cert.name}</h2>
        <p className="info-lede">{cert.issuer}</p>
        <p className="date-range">Issued {cert.date}</p>
        <div className="info-actions">
          <a className="button button--primary" href={cert.url} target="_blank" rel="noopener noreferrer">Verify credential <span aria-hidden="true">↗</span></a>
        </div>
        <NodeLinks nodes={connected.filter((item) => item.type === 'skill')} onJump={onJump} label="Skills" />
      </>
    );
  } else {
    body = (
      <>
        <p className="info-kicker">Contact</p>
        <h2>Get in touch</h2>
        <a className="info-email" href={`mailto:${content.profile.email}`}>{content.profile.email}</a>
        <div className="contact-actions"><CopyEmail email={content.profile.email} /></div>
        {content.profile.socials && (
          <ul className="social-links" aria-label="Social links">
            {content.profile.socials.map((social) => (
              <li key={social.url}><a href={social.url} target="_blank" rel="noopener noreferrer">{social.label} <span aria-hidden="true">↗</span></a></li>
            ))}
          </ul>
        )}
        <NodeLinks nodes={connected} onJump={onJump} />
      </>
    );
  }

  const sheetStyle = dragOffset === null ? undefined : { transform: `translateY(${dragOffset}px)` } as CSSProperties;
  return (
    <aside className={`info-card${expanded ? ' is-expanded' : ' is-collapsed'}${dragOffset !== null ? ' is-dragging' : ''}`} style={sheetStyle} aria-label="Node details">
      <button
        type="button"
        className="info-card__handle"
        aria-expanded={expanded}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setExpanded((current) => !current);
        }}
      >
        <span className="info-card__grip" aria-hidden="true" />
        <span>{node ? node.fullLabel : 'Node details'}</span>
      </button>
      <div className="info-card__scroll">
        {node && <button type="button" className="info-card__clear" onClick={onClear}>Clear selection</button>}
        <div className="info-card__content" key={node?.id ?? 'empty'}>{body}</div>
      </div>
    </aside>
  );
}
