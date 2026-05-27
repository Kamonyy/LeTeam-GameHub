'use client';

import { useEffect, useRef } from 'react';

type ShapeKind = 'domino' | 'letter' | 'block';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vr: number;
  kind: ShapeKind;
  letter?: string;
  opacity: number;
}

const LETTERS = 'PLAYDOMINO';

function createParticle(w: number, h: number): Particle {
  const kinds: ShapeKind[] = ['domino', 'letter', 'block'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.2 - 0.05,
    size: 12 + Math.random() * 18,
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.004,
    kind,
    letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
    opacity: 0.04 + Math.random() * 0.06,
  };
}

export default function HubParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.current.length === 0) {
        const count = Math.min(28, Math.floor((window.innerWidth * window.innerHeight) / 45000));
        particles.current = Array.from({ length: count }, () =>
          createParticle(window.innerWidth, window.innerHeight)
        );
      }
    };

    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const parallaxX = (mouse.current.x - 0.5) * 24;
      const parallaxY = (mouse.current.y - 0.5) * 18;

      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;

        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;
        if (p.y < -40) p.y = h + 40;
        if (p.y > h + 40) p.y = -40;

        const px = p.x + parallaxX * (p.size / 20);
        const py = p.y + parallaxY * (p.size / 20);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.kind === 'domino') {
          const dw = p.size * 0.55;
          const dh = p.size;
          ctx.fillStyle = 'rgba(200, 210, 230, 0.35)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-dw / 2, -dh / 2, dw, dh, 3);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-dw / 2 + 3, 0);
          ctx.lineTo(dw / 2 - 3, 0);
          ctx.stroke();
        } else if (p.kind === 'letter') {
          ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
          ctx.font = `600 ${p.size}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.letter ?? '?', 0, 0);
        } else {
          const s = p.size * 0.85;
          ctx.fillStyle = 'rgba(129, 140, 248, 0.25)';
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-s / 2, -s / 2, s, s, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.font = `700 ${s * 0.45}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', 0, 1);
        }

        ctx.restore();
      }

      raf.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    raf.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="hub-particle-canvas" aria-hidden />;
}
