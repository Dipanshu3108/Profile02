import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: 'mint' | 'blue' | 'amber' | 'ink';
}

const COLORS = {
  mint: [139, 245, 200],
  blue: [110, 168, 255],
  amber: [245, 194, 107],
  ink: [185, 193, 208],
} as const;

/**
 * A living constellation behind the hero: drifting nodes that link up when
 * close and light up around the cursor. A nod to the knowledge graph.
 */
export default function HeroNetwork({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let visible = true;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      const count = Math.round(Math.min(110, Math.max(36, (width * height) / 14000)));
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: i % 17 === 0 ? 2.6 : Math.random() * 1.4 + 0.8,
        hue: i % 17 === 0 ? 'amber' : i % 5 === 0 ? 'mint' : i % 7 === 0 ? 'blue' : 'ink',
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = Math.min(150, width / 7);
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const mx = (a.x + b.x) / 2 - mouse.x;
            const my = (a.y + b.y) / 2 - mouse.y;
            const near = Math.max(0, 1 - Math.hypot(mx, my) / 220);
            const alpha = (1 - d / linkDist) * (0.14 + near * 0.5);
            ctx.strokeStyle = near > 0.05 ? `rgba(139,245,200,${alpha})` : `rgba(160,175,200,${alpha})`;
            ctx.lineWidth = 0.6 + near * 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        const [r, g, b] = COLORS[p.hue];
        const near = Math.max(0, 1 - Math.hypot(p.x - mouse.x, p.y - mouse.y) / 200);
        const radius = p.r + near * 1.6;
        if (p.hue === 'amber' || near > 0.2) {
          ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${0.55 + near * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of particles) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) {
          p.vx += (dx / d) * 0.012;
          p.vy += (dy / d) * 0.012;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 0.08) {
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
      draw();
      frame = requestAnimationFrame(loop);
    };

    const loop = () => {
      if (!visible) return;
      step();
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      if (reducedMotion) draw();
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !reducedMotion) frame = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    if (!reducedMotion) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="hero__network" aria-hidden="true" />;
}
