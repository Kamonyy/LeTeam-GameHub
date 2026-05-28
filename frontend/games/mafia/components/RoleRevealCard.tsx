'use client';

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MafiaButton } from '@/components/mafia/mafia-button';
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardHeader,
  MafiaCardTitle,
} from '@/components/mafia/mafia-panel';
import type { MafiaRoleView } from '../types';
import {
  roleAbilityTooltipLines,
  resolveRoleAccent,
  roleThemeStyleFromRole,
} from '../lib/roleTheme';

interface RoleRevealCardProps {
  role: MafiaRoleView;
  onAcknowledge?: () => void;
  acknowledging?: boolean;
}

function roleAccentStyle(role: MafiaRoleView): CSSProperties {
  const accent = resolveRoleAccent(role.id, role.accentColor);
  return {
    ...roleThemeStyleFromRole(role.id, role.accentColor),
    '--accent': accent,
  } as CSSProperties;
}

function RoleSeal({ role }: { role: MafiaRoleView }) {
  const accent = resolveRoleAccent(role.id, role.accentColor);
  const abilityLines = roleAbilityTooltipLines(role.id);
  const sealClass =
    'relative z-[2] mx-auto mb-5 inline-flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border-[3px] text-[2.6rem] shadow-[inset_0_2px_0_rgba(255,235,180,0.35),inset_0_-3px_6px_rgba(0,0,0,0.6),0_8px_22px_-6px_rgba(0,0,0,0.7)] max-sm:h-[4.5rem] max-sm:w-[4.5rem] max-sm:text-[2.1rem]';
  const sealStyle = {
    borderColor: `color-mix(in srgb, ${accent} 70%, #d4a64a)`,
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${accent} 50%, transparent) 0%, transparent 60%), linear-gradient(180deg, #2a1d0c 0%, #14100a 100%)`,
    boxShadow: `inset 0 2px 0 rgba(255,235,180,0.35), inset 0 -3px 6px rgba(0,0,0,0.6), 0 0 24px -2px color-mix(in srgb, ${accent} 50%, transparent), 0 8px 22px -6px rgba(0,0,0,0.7)`,
  } as CSSProperties;

  const glow = (
    <div
      className="absolute -inset-3.5 -z-10 animate-pulse-soft rounded-full blur-[10px] motion-reduce:animate-none"
      style={{
        background: `radial-gradient(circle, color-mix(in srgb, ${accent} 40%, transparent) 0%, transparent 70%)`,
      }}
      aria-hidden
    />
  );

  const seal = (
    <div className={sealClass} style={sealStyle}>
      {glow}
      <span aria-hidden>{role.icon}</span>
    </div>
  );

  if (abilityLines.length === 0) {
    return seal;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={clsx(sealClass, 'cursor-help border-0 bg-transparent p-0')}
          style={sealStyle}
          aria-label={`${role.nameEn} abilities`}
        >
          {glow}
          <span aria-hidden>{role.icon}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[16rem]">
        <ul className="list-disc space-y-1 pl-4 text-left">
          {abilityLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function RoleAbilitiesList({
  lines,
  className,
}: {
  lines: string[];
  className?: string;
}) {
  if (lines.length === 0) return null;

  return (
    <div className={clsx('text-left', className)}>
      <p className="mb-1.5 font-cinzel text-[0.68rem] font-bold uppercase tracking-[0.22em] text-amber-200/85">
        Abilities
      </p>
      <ul className="m-0 list-disc space-y-1 pl-4 text-sm leading-snug text-[color:var(--p1-ink-soft)]">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export default function RoleRevealCard({
  role,
  onAcknowledge,
  acknowledging = false,
}: RoleRevealCardProps) {
  const locked = !role.pendingAcknowledge;
  const accent = resolveRoleAccent(role.id, role.accentColor);
  const cardStyle = roleAccentStyle(role);
  const abilityLines = roleAbilityTooltipLines(role.id);

  return (
    <TooltipProvider delayDuration={200}>
      <MafiaCard
        variant="elevated"
        className={clsx(
          'relative mx-auto w-full max-w-[26rem] animate-fade-in p-9 text-center motion-reduce:animate-none max-sm:p-7',
          locked && 'border-amber-800/50',
        )}
        style={{
          ...cardStyle,
          background: locked
            ? `radial-gradient(ellipse at 50% 100%, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(28,20,10,0.88) 0%, rgba(14,10,6,0.94) 100%)`
            : `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${accent} 28%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(48,34,18,0.88) 0%, rgba(18,12,6,0.94) 100%)`,
          boxShadow: `inset 0 1px 0 rgba(212,166,74,0.35), inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 -30px 60px -30px rgba(0,0,0,0.85), var(--mf-shadow-panel), 0 0 36px -6px color-mix(in srgb, ${accent} 35%, transparent)`,
        }}
        role="region"
        aria-label="Your secret role"
      >
        <MafiaCardHeader className="items-center space-y-2 p-0 pb-2 text-center">
          <RoleSeal role={role} />
          <p
            className="mb-1 font-cormorant text-[1.4rem] text-[color:var(--p1-ink-soft)]"
            dir="rtl"
          >
            {role.nameAr}
          </p>
          <MafiaCardTitle className="mb-0 border-0 bg-transparent p-0 font-cinzel text-[clamp(1.65rem,5vw,2.25rem)] font-bold uppercase tracking-[0.18em] text-transparent shadow-none bg-gradient-to-b from-amber-50 via-amber-200 to-amber-700 bg-clip-text">
            {role.nameEn}
          </MafiaCardTitle>
        </MafiaCardHeader>

        <MafiaCardContent className="p-0 text-center">
          {!locked && (
            <>
              <p className="mb-1 font-cormorant text-base text-[color:var(--p1-ink-soft)]" dir="rtl">
                {role.descriptionAr}
              </p>
              <p className="mb-4 font-cormorant text-base text-[color:var(--p1-ink-soft)]">
                {role.descriptionEn}
              </p>
              <RoleAbilitiesList lines={abilityLines} className="mb-4" />
              {role.pendingAcknowledge && onAcknowledge && (
                <MafiaButton
                  variant="primary"
                  className="w-full min-h-11"
                  onClick={onAcknowledge}
                  disabled={acknowledging}
                >
                  {acknowledging ? '…' : 'I have read my role'}
                </MafiaButton>
              )}
            </>
          )}

          {locked && (
            <div className="flex flex-col items-center gap-3 pt-1">
              <div
                className="relative h-20 w-20 animate-[spin_18s_linear_infinite] rounded-full motion-reduce:animate-none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${accent} 38%, transparent) 0%, transparent 55%), conic-gradient(from 0deg, transparent 0deg, ${accent} 30deg, transparent 60deg, ${accent} 120deg, transparent 150deg, ${accent} 210deg, transparent 240deg, ${accent} 300deg, transparent 330deg)`,
                  WebkitMask:
                    'radial-gradient(circle, transparent 38%, #000 39%, #000 50%, transparent 51%)',
                  mask: 'radial-gradient(circle, transparent 38%, #000 39%, #000 50%, transparent 51%)',
                  filter: `drop-shadow(0 0 10px color-mix(in srgb, ${accent} 60%, transparent))`,
                }}
                aria-hidden
              >
                <span
                  className="absolute inset-0 flex items-center justify-center font-cinzel text-2xl"
                  style={{ color: accent }}
                >
                  ◆
                </span>
              </div>
              <p className="m-0 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-700 bg-clip-text font-cinzel text-2xl font-bold uppercase tracking-[0.22em] text-transparent">
                {role.nameEn}
              </p>
              <p className="m-0 font-cormorant text-base italic text-[color:var(--p1-ink-dim)]">
                <span className="mx-1.5 text-amber-600/55">~</span>
                Oath sealed — await the narrator
                <span className="mx-1.5 text-amber-600/55">~</span>
              </p>
              <RoleAbilitiesList lines={abilityLines} className="w-full pt-1" />
            </div>
          )}
        </MafiaCardContent>
      </MafiaCard>
    </TooltipProvider>
  );
}
