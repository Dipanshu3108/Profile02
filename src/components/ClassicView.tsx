import { motion, type Variants } from 'motion/react';
import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { BotAvatar, type BotAvatarType } from 'bot-avatars';
import type { Content } from '../types';
import type { Theme } from '../lib/theme';
import ProjectCard from './ProjectCard';
import SkillChips from './SkillChips';
import SkillMarquee from './SkillMarquee';
import CopyEmail from './CopyEmail';
import HeroNetwork from './HeroNetwork';
import { GraphIcon } from './icons';

type Origin = { x: number; y: number };

interface ClassicViewProps {
  content: Content;
  theme: Theme;
  reducedMotion: boolean;
  onOpenInGraph: (nodeId: string | null, origin?: Origin) => void;
}

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      className="section"
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-12% 0px' }}
      variants={reveal}
    >
      <header className="section__head">
        <h2 className="section__title">{title}</h2>
      </header>
      {children}
    </motion.section>
  );
}

let heroHasEntered = false;

const HERO_BOTS: BotAvatarType[] = ['mech', 'hexagon'];
const CONTACT_BOTS: BotAvatarType[] = ['clover', 'flower', 'ghost', 'star'];

/** bot-avatars' hop cycle in the working state (its `D0`), in ms. */
const HOP_MS = 680;
/** Two bots whose start times are closer than this on the hop cycle look like they hop together. */
const MIN_PHASE_GAP_MS = 120;

/**
 * Start times (ms) for a row of working bots: the first at 0, each next one 0.4 to 1.2 s after the
 * one before. Since the hop repeats every 680 ms, a gap near a whole number of hops would put two
 * bots back in step, so gaps are redrawn until every pair sits apart on the cycle.
 */
function staggerStarts(count: number): number[] {
  const starts = [0];
  while (starts.length < count) {
    const previous = starts[starts.length - 1];
    let next = previous + 400 + Math.random() * 800;
    for (let tries = 0; tries < 30; tries++) {
      const candidate = previous + 400 + Math.random() * 800;
      const apart = starts.every((start) => {
        const phase = (candidate - start) % HOP_MS;
        return Math.min(phase, HOP_MS - phase) >= MIN_PHASE_GAP_MS;
      });
      next = candidate;
      if (apart) break;
    }
    starts.push(next);
  }
  return starts;
}

/**
 * The working bots beside the Contact heading. Every working bot starts its hop cycle at the same
 * point, so each one is held still until its own start time. bot-avatars only animates a bot while
 * it is on screen and the tab is visible, so the start clock follows the same rule: it runs on
 * animation frames, only while the row is in view. A plain timer would run out while Contact is
 * still far down the page, and the bots would all begin together when it scrolls in.
 */
function ContactBots({ reducedMotion }: { reducedMotion: boolean }) {
  const rowRef = useRef<HTMLSpanElement>(null);
  const [starts] = useState(() => staggerStarts(CONTACT_BOTS.length));
  const [startedCount, setStartedCount] = useState(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || reducedMotion) return;
    let elapsed = 0;
    let last = 0;
    let frame = 0;
    let count = 0;
    const tick = (now: number) => {
      frame = 0;
      // Same 100 ms cap per frame as bot-avatars, so both clocks pause and resume together.
      if (last) elapsed += Math.min(100, now - last);
      last = now;
      while (count < starts.length && elapsed >= starts[count]) count++;
      setStartedCount(count);
      if (count < starts.length) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry?.isIntersecting ?? true;
      if (visible && !frame && count < starts.length) {
        last = 0;
        frame = requestAnimationFrame(tick);
      } else if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(row);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [starts, reducedMotion]);

  return (
    <span className="section__bots" aria-hidden="true" ref={rowRef}>
      {CONTACT_BOTS.map((type, index) => (
        <BotAvatar
          key={type}
          className="bot-avatar"
          type={type}
          state="working"
          shading="plastic"
          size={64}
          paused={reducedMotion || index >= startedCount}
        />
      ))}
    </span>
  );
}

/** Puts the role's chosen top skills first, then the rest in source order. */
function orderByTop(ids: string[], top: string[] = []): string[] {
  const topSet = new Set(top);
  return [...top.filter((id) => ids.includes(id)), ...ids.filter((id) => !topSet.has(id))];
}

export default function ClassicView({ content, theme, reducedMotion, onOpenInGraph }: ClassicViewProps) {
  const { profile, experience, education, projects, skills } = content;
  const focus = (profile.focusSkills ?? []).map((id) => skills.find((skill) => skill.id === id)?.label).filter(Boolean);
  const [animateHero] = useState(() => !heroHasEntered && !reducedMotion);
  useEffect(() => { heroHasEntered = true; }, []);

  const classicProjects = projects;
  const workProjects = classicProjects.filter((project) => project.experienceId);
  const researchProjects = classicProjects.filter((project) => !project.experienceId);
  const certifications = content.certifications ?? [];
  const courseById = new Map((content.courses ?? []).map((course) => [course.id, course]));
  const nameWords = profile.name.split(' ');

  const fromEvent = (event: MouseEvent<HTMLElement>): Origin => ({ x: event.clientX, y: event.clientY });

  return (
    <div className="classic-view">
      <section className="hero" id="top">
        <HeroNetwork reducedMotion={reducedMotion} theme={theme} />
        <div className="hero__inner">
          {focus.length > 0 && (
            <motion.button
              type="button"
              className="focus-badge"
              onClick={(event) => onOpenInGraph(profile.focusSkills![0], fromEvent(event))}
              initial={animateHero ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <span className="focus-badge__star" aria-hidden="true">✦</span>
              <span className="focus-badge__label">Current focus</span>
              <span className="focus-badge__value">{focus.join(', ')}</span>
              <span className="focus-badge__action">Open in graph</span>
            </motion.button>
          )}

          <h1 className="hero__name" aria-label={profile.name}>
            {nameWords.map((word, wordIndex) => {
              const letters = (
                <span className="hero__word" aria-hidden="true">
                  {[...word].map((letter, letterIndex) => (
                    <motion.span
                      key={letterIndex}
                      className="hero__letter"
                      initial={animateHero ? { y: '110%', rotate: 8, opacity: 0 } : false}
                      animate={{ y: '0%', rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.15 + (wordIndex * 6 + letterIndex) * 0.035, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              );
              if (wordIndex < nameWords.length - 1) return <Fragment key={word}>{letters}</Fragment>;
              // The last word carries the bot, so the two wrap onto a new line together.
              return (
                <span key={word} className="hero__tail">
                  {letters}
                  {/* Decorative: two bots hop beside the name, and hop higher when clicked. */}
                  <span className="hero__bots" aria-hidden="true">
                    {HERO_BOTS.map((type, index) => (
                      <motion.span
                        key={type}
                        className="hero__bot"
                        initial={animateHero ? { opacity: 0, scale: 0.6 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + index * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <BotAvatar className="bot-avatar" type={type} shading="plastic" size={64} paused={reducedMotion} />
                      </motion.span>
                    ))}
                  </span>
                </span>
              );
            })}
          </h1>

          <motion.p
            className="hero__headline"
            initial={animateHero ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
          >
            {profile.headline}
          </motion.p>

          <motion.div
            className="hero__actions"
            initial={animateHero ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <a className="button button--primary" href="#projects">See projects</a>
            <a className="button button--ghost" href="#contact">Get in touch</a>
            <button type="button" className="hero__graph-link" onClick={(event) => onOpenInGraph(null, fromEvent(event))}>
              <GraphIcon />
              Explore my knowledge graph
            </button>
          </motion.div>
        </div>
      </section>

      <SkillMarquee skills={skills} />

      <div className="sections">
        <Section id="about" title="About">
          <div className={`about${profile.stats?.length ? '' : ' about--solo'}`}>
            <div className="about__text">
              {profile.about.map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
            </div>
            {profile.stats && profile.stats.length > 0 && (
              <ul className="stats">
                {profile.stats.map((stat) => {
                  const { projectId } = stat;
                  return (
                    <li key={stat.value}>
                      {projectId ? (
                        <button
                          type="button"
                          className="stat stat--link"
                          onClick={(event) => onOpenInGraph(projectId, fromEvent(event))}
                        >
                          <span className="stat__value">{stat.value}</span>
                          <span className="stat__label">{stat.label}</span>
                          <span className="stat__action">Open project in graph</span>
                        </button>
                      ) : (
                        <div className="stat">
                          <span className="stat__value">{stat.value}</span>
                          <span className="stat__label">{stat.label}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>

        <Section id="experience" title="Experience">
          <ol className="timeline">
            {experience.map((item) => (
              <li className="timeline__item" key={item.id}>
                <div className="timeline__meta">
                  <span className="timeline__dates">{item.start} to {item.end}</span>
                  {item.location && <span className="timeline__location">{item.location}</span>}
                  {item.end === 'Present' && <span className="timeline__now">Current role</span>}
                </div>
                <article className="timeline__card">
                  <h3>{item.role}</h3>
                  <p className="timeline__org">{item.organization}</p>
                  <ul className="highlights">
                    {item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                  <SkillChips ids={orderByTop(item.skills, item.topSkills)} skills={skills} limit={item.topSkills?.length || 12} />
                </article>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="education" title="Education">
          <ul className="education">
            {education.map((item) => (
              <li key={item.id} className="education__row">
                <div>
                  <h3>{item.degree}</h3>
                  <p>{item.institution}{item.gpa ? `, GPA ${item.gpa}` : ''}</p>
                  {item.notes && <p>{item.notes}</p>}
                  {(item.honors?.length || item.activities?.length) ? (
                    <ul className="education__extras">
                      {[...(item.honors ?? []), ...(item.activities ?? [])].map((extra) => <li key={extra}>{extra}</li>)}
                    </ul>
                  ) : null}
                </div>
                <span className="mono">{item.start} to {item.end}</span>
              </li>
            ))}
          </ul>
          {certifications.length > 0 && (
            <div className="certs">
              <h3 className="project-group__title">Certifications <span className="mono">{certifications.length}</span></h3>
              <ul className="certs__grid">
                {certifications.map((cert) => (
                  <li key={cert.id}>
                    <a className="cert" href={cert.url} target="_blank" rel="noopener noreferrer">
                      <span className="cert__name">{cert.name}</span>
                      <span className="mono">{cert.issuer}, {cert.date}</span>
                      <span className="cert__verify">Verify ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section id="projects" title="Projects">
          <div className="project-group">
            <h3 className="project-group__title">At {experience[0]?.organization ?? 'work'} <span className="mono">{workProjects.length}</span></h3>
            <div className="projects-grid">
              {workProjects.map((project) => (
                <ProjectCard key={project.id} project={project} skills={skills} onOpenInGraph={onOpenInGraph} reducedMotion={reducedMotion} theme={theme} />
              ))}
            </div>
          </div>
          <div className="project-group">
            <h3 className="project-group__title">Research and academic <span className="mono">{researchProjects.length}</span></h3>
            <div className="projects-grid">
              {researchProjects.map((project) => (
                <ProjectCard key={project.id} project={project} skills={skills} course={project.courseId ? courseById.get(project.courseId) : undefined} onOpenInGraph={onOpenInGraph} reducedMotion={reducedMotion} theme={theme} />
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="contact"
          title={(
            <>
              Contact
              {/* Decorative: the heading's accessible name stays "Contact". */}
              <ContactBots reducedMotion={reducedMotion} />
            </>
          )}
        >
          <div className="contact">
            <a className="contact__email" href={`mailto:${profile.email}`}>{profile.email}</a>
            <div className="contact__row">
              <CopyEmail email={profile.email} />
              {profile.socials?.map((social) => (
                <a key={social.url} className="button button--small" href={social.url} target="_blank" rel="noopener noreferrer">
                  {social.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
