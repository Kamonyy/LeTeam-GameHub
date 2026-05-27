'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { GameCatalogEntry } from '@/lib/hub/games-registry';
import HubDominoTile from './HubDominoTile';

const SPARKS = [
  { sx: '6px', sy: '-18px', delay: '0s' },
  { sx: '-10px', sy: '-22px', delay: '0.08s' },
  { sx: '14px', sy: '-14px', delay: '0.12s' },
  { sx: '-4px', sy: '-26px', delay: '0.05s' },
];

const CURSOR_BY_GAME: Record<string, string> = {
  dominoes: 'grab',
  wordgame: 'letter',
  'bara-alsalafa': 'crosshair',
};

interface GameArcadeCardProps {
  game: GameCatalogEntry;
  staggerIndex: number;
}

function WordPreview({ active }: { active: boolean }) {
  const [slots, setSlots] = useState(['_', '_', '_', '_']);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!active) {
      setLocked(false);
      setSlots(['_', '_', '_', '_']);
      return;
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      if (frame > 14) {
        setLocked(true);
        setSlots(['P', 'L', 'A', 'Y']);
        window.clearInterval(id);
        return;
      }
      setSlots(
        Array.from({ length: 4 }, () =>
          Math.random() > 0.5 ? letters[Math.floor(Math.random() * letters.length)] : '_'
        )
      );
    }, 70);

    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div className="hub-word-slots mt-4" aria-hidden>
      {slots.map((ch, i) => (
        <span key={i} className={clsx('hub-word-slot', locked && 'text-sky-300')}>
          {ch}
        </span>
      ))}
      {locked && (
        <span className="hub-word-slot text-emerald-400 !w-auto ml-0.5">!</span>
      )}
    </div>
  );
}

export default function GameArcadeCard({ game, staggerIndex }: GameArcadeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [transform, setTransform] = useState('');

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = y * -14;
    const rotateY = x * 14;
    setTransform(
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05) translateZ(0)`
    );
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(false);
    setTransform('');
  }, []);

  const handleEnter = useCallback(() => setHovered(true), []);

  const cardClass = clsx(
    'hub-game-card hub-enter-card block rounded-2xl border border-hub-border bg-hub-card p-6 overflow-hidden min-h-[220px]',
    `hub-game-card--${game.id}`,
    hovered && 'hub-game-card--hovered',
    !game.active && 'opacity-70 cursor-not-allowed'
  );

  const inner = (
  <>
      {game.id === 'dominoes' && (
        <>
          <HubDominoTile top={3} bottom={6} className="hub-domino-tile--a" />
          <HubDominoTile top={1} bottom={5} className="hub-domino-tile--b" />
          {hovered &&
            SPARKS.map((s, i) => (
              <span
                key={i}
                className="hub-domino-spark"
                style={
                  {
                    left: `${30 + i * 12}%`,
                    bottom: '28%',
                    animationDelay: s.delay,
                    '--sx': s.sx,
                    '--sy': s.sy,
                  } as React.CSSProperties
                }
                aria-hidden
              />
            ))}
        </>
      )}

      {game.id === 'bara-alsalafa' && (
        <span className="hub-bara-spotlight rounded-2xl" aria-hidden />
      )}

      <div className="hub-game-card__surface relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={clsx(
              'w-14 h-14 rounded-xl flex items-center justify-center text-2xl border',
              game.id === 'dominoes' && 'bg-emerald-500/10 border-emerald-500/25',
              game.id === 'wordgame' && 'bg-sky-500/10 border-sky-500/25',
              game.id === 'bara-alsalafa' && 'bg-rose-500/10 border-rose-500/25'
            )}
          >
            <span className={game.id === 'bara-alsalafa' ? 'hub-bara-logo' : undefined}>
              {game.icon ?? '🎮'}
            </span>
          </div>
          {game.active ?
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-hub-success/15 text-hub-success border border-hub-success/25">
              Live
            </span>
          : <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hub-border/80 text-hub-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Soon
            </span>
          }
        </div>

        <h4 className="text-xl font-bold mb-2 text-gray-50 group-hover:text-white transition-colors">
          {game.name}
        </h4>
        <p className="text-hub-muted text-sm mb-3 leading-snug line-clamp-2">{game.tagline}</p>

        {game.id === 'wordgame' && <WordPreview active={hovered} />}

        {!game.active && game.disabledReason && (
          <p className="text-xs text-hub-warning mb-3">{game.disabledReason}</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-2 border-t border-hub-border/50">
          <span className="text-xs text-hub-muted font-medium">{game.players} players</span>
          {game.active && (
            <span className="flex items-center gap-1 text-sm text-hub-accent font-semibold">
              Play
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const style = {
    ['--hub-stagger' as string]: staggerIndex,
    transform: hovered ? transform : undefined,
  } as React.CSSProperties;

  const shellProps = {
    ref: cardRef,
    className: clsx(cardClass, game.active && 'group'),
    style,
    onMouseMove: handleMove,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    'data-hub-cursor': CURSOR_BY_GAME[game.id] ?? 'default',
  };

  if (game.active) {
    return (
      <div {...shellProps}>
        <Link href={game.href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-hub-accent rounded-2xl">
          {inner}
        </Link>
      </div>
    );
  }

  return (
    <div {...shellProps} aria-disabled>
      {inner}
    </div>
  );
}
