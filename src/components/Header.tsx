import { motion } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { Mode } from '../types';
import { CloseIcon, GraphIcon, ListIcon, MenuIcon } from './icons';

interface HeaderProps {
  name: string;
  status: string;
  mode: Mode;
  onModeChange: (mode: Mode, origin?: { x: number; y: number }) => void;
  onPreloadGraph: () => void;
  motionPaused: boolean;
  /** Omitted when the OS already asks for reduced motion: the loops are off and the switch would do nothing. */
  onToggleMotion?: () => void;
}

const links = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
];

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="2.6" height="10" rx="1" />
      <rect x="9.4" y="3" width="2.6" height="10" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3.4v9.2a.8.8 0 0 0 1.2.7l7.4-4.6a.8.8 0 0 0 0-1.4L6.2 2.7A.8.8 0 0 0 5 3.4Z" />
    </svg>
  );
}

export default function Header({ name, status, mode, onModeChange, onPreloadGraph, motionPaused, onToggleMotion }: HeaderProps) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  // Below 760px the inline section links are hidden; a menu button opens them as a list instead.
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode !== 'classic') setMenuOpen(false);
  }, [mode]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  const choose = (next: Mode) => (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onModeChange(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <header className="site-header" ref={headerRef}>
      <a
        className="brand"
        href="#top"
        aria-label={`${name}, back to top`}
        onClick={(event) => {
          if (mode === 'graph') {
            event.preventDefault();
            onModeChange('classic');
          }
        }}
      >
        <span className="brand__mark" aria-hidden="true">{initials}</span>
        <span className="brand__status">{status}</span>
      </a>

      {mode === 'classic' && (
        <nav className="site-nav" aria-label="Sections">
          {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>
      )}

      <div className="site-header__controls">
        <div className="mode-toggle" role="group" aria-label="Portfolio view" onPointerEnter={onPreloadGraph} onFocus={onPreloadGraph}>
          {(['classic', 'graph'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="mode-toggle__button"
              aria-pressed={mode === value}
              onClick={choose(value)}
            >
              {mode === value && (
                <motion.span
                  layoutId="mode-thumb"
                  className="mode-toggle__thumb"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              {value === 'classic' ? <ListIcon /> : <GraphIcon />}
              <span>{value === 'classic' ? 'Classic' : 'Graph'}</span>
            </button>
          ))}
        </div>

        {onToggleMotion && (
          <button
            type="button"
            className="motion-toggle"
            aria-pressed={motionPaused}
            aria-label="Pause background animation"
            title={motionPaused ? 'Play background animation' : 'Pause background animation'}
            onClick={onToggleMotion}
          >
            {motionPaused ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
        {mode === 'classic' && (
          <button
            ref={menuButtonRef}
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label="Sections"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        )}
      </div>

      {mode === 'classic' && menuOpen && (
        <nav id="site-menu" className="site-menu" aria-label="Sections">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
