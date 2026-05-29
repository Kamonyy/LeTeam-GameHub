'use client';

import type { CSSProperties, ReactNode } from 'react';
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
  roleAbilityLines,
  type RoleAbilityLine,
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

function roleSummary(role: MafiaRoleView) {
  return {
    en: role.summaryEn ?? role.descriptionEn,
    ar: role.summaryAr ?? role.descriptionAr,
  };
}

function RoleSeal({
  role,
  compact = false,
}: {
  role: MafiaRoleView;
  compact?: boolean;
}) {
  const accent = resolveRoleAccent(role.id, role.accentColor);
  const abilityLines = roleAbilityLines(role.id);
  const sealClass = clsx(
    'relative z-[2] mx-auto inline-flex items-center justify-center rounded-full border-[3px] shadow-[inset_0_2px_0_rgba(255,235,180,0.35),inset_0_-3px_6px_rgba(0,0,0,0.6),0_8px_22px_-6px_rgba(0,0,0,0.7)]',
    compact ?
      'mb-3 h-[4.25rem] w-[4.25rem] text-[2rem]'
    : 'mb-4 h-[5rem] w-[5rem] text-[2.35rem]',
  );
  const sealStyle = {
    borderColor: `color-mix(in srgb, ${accent} 70%, #d4a64a)`,
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${accent} 50%, transparent) 0%, transparent 60%), linear-gradient(180deg, #2a1d0c 0%, #14100a 100%)`,
    boxShadow: `inset 0 2px 0 rgba(255,235,180,0.35), inset 0 -3px 6px rgba(0,0,0,0.6), 0 0 24px -2px color-mix(in srgb, ${accent} 50%, transparent), 0 8px 22px -6px rgba(0,0,0,0.7)`,
  } as CSSProperties;

  const glow = (
    <div
      className="absolute -inset-3 -z-10 animate-pulse-soft rounded-full blur-[8px] motion-reduce:animate-none"
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
          aria-label={`قدرات ${role.nameAr} · ${role.nameEn} abilities`}
        >
          {glow}
          <span aria-hidden>{role.icon}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[17rem]">
        <ul className="m-0 list-none space-y-1.5 p-0 text-left">
          {abilityLines.map((line) => (
            <li key={line.en} className="space-y-0.5">
              <p className="m-0 text-sm leading-snug" dir="rtl">
                {line.ar}
              </p>
              <p className="m-0 text-xs leading-snug text-amber-100/75">
                {line.en}
              </p>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

const roleTitleClass =
  'mb-0 border-0 bg-transparent p-0 font-cinzel font-bold uppercase tracking-[0.12em] text-amber-50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]';

function roleTitleStyle(accent: string): CSSProperties {
  return {
    color: accent,
    textShadow: [
      `0 0 20px color-mix(in srgb, ${accent} 50%, transparent)`,
      '0 2px 10px rgba(0, 0, 0, 0.92)',
    ].join(', '),
  };
}

function RoleBodyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'mf-role-reveal__body-panel mx-auto w-full max-w-[20rem] rounded-md px-3 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

function RoleExplanation({ role }: { role: MafiaRoleView }) {
  const summary = roleSummary(role);

  return (
    <RoleBodyPanel className="space-y-1.5 text-center">
      <p
        className="m-0 font-cinzel text-[0.62rem] font-bold uppercase tracking-[0.16em] text-amber-100/90"
        dir="rtl"
      >
        شنو دورك
      </p>
      <p
        className="m-0 font-cormorant text-[0.98rem] font-medium leading-snug text-amber-50"
        dir="rtl"
      >
        {summary.ar}
      </p>
      <p className="m-0 font-cormorant text-[0.82rem] leading-snug text-amber-50/75">
        {summary.en}
      </p>
    </RoleBodyPanel>
  );
}

function RoleAbilitiesList({ lines }: { lines: RoleAbilityLine[] }) {
  if (lines.length === 0) return null;

  return (
    <RoleBodyPanel className="mt-2 space-y-1.5 text-center">
      <p
        className="m-0 font-cinzel text-[0.62rem] font-bold uppercase tracking-[0.16em] text-amber-100/90"
        dir="rtl"
      >
        قدراتك
      </p>
      <ul className="m-0 list-none space-y-1.5 p-0">
        {lines.map((line) => (
          <li key={line.en} className="text-center">
            <p
              className="m-0 font-cormorant text-[0.9rem] leading-snug text-amber-50"
              dir="rtl"
            >
              {line.ar}
            </p>
            <p className="m-0 font-cormorant text-[0.78rem] leading-snug text-amber-50/70">
              {line.en}
            </p>
          </li>
        ))}
      </ul>
    </RoleBodyPanel>
  );
}

function RoleOathFooter({ locked }: { locked: boolean }) {
  if (!locked) return null;

  return (
    <p className="m-0 mt-2.5 text-center font-cormorant text-[0.82rem] leading-snug text-amber-200/85">
      <span dir="rtl">خلصت — استنى الراوي</span>
      <span className="mx-1.5 text-amber-600/50" aria-hidden>
        ·
      </span>
      <span className="text-amber-200/70">Await the narrator</span>
    </p>
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
  const abilityLines = roleAbilityLines(role.id);

  return (
    <TooltipProvider delayDuration={200}>
      <MafiaCard
        variant="elevated"
        interactive={false}
        className={clsx(
          'mf-role-reveal mf-surface--float relative mx-auto w-full max-w-[24rem] animate-fade-in text-center motion-reduce:animate-none',
          locked ? 'border-amber-800/50 p-5 sm:p-6' : 'p-6 sm:p-7',
        )}
        style={{
          ...cardStyle,
          ['--mf-role-accent' as string]: accent,
          background: locked
            ? `radial-gradient(ellipse at 50% 100%, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(28,20,10,0.88) 0%, rgba(14,10,6,0.94) 100%)`
            : `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${accent} 28%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(48,34,18,0.88) 0%, rgba(18,12,6,0.94) 100%)`,
          boxShadow: `inset 0 1px 0 rgba(212,166,74,0.35), inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 -30px 60px -30px rgba(0,0,0,0.85), var(--mf-shadow-panel), 0 0 36px -6px color-mix(in srgb, ${accent} 35%, transparent)`,
        }}
        role="region"
        aria-label="دورك السري · Your secret role"
      >
        <div className="mf-role-reveal__pedestal" aria-hidden />
        <MafiaCardHeader className="items-center space-y-1 p-0 pb-2 text-center">
          <RoleSeal role={role} compact={locked} />
          <p
            className="m-0 font-cormorant text-[1.35rem] font-semibold leading-tight text-amber-50"
            dir="rtl"
          >
            {role.nameAr}
          </p>
          <MafiaCardTitle
            className={clsx(
              roleTitleClass,
              'text-[clamp(1.35rem,4.5vw,1.85rem)]',
            )}
            style={roleTitleStyle(accent)}
          >
            {role.nameEn}
          </MafiaCardTitle>
        </MafiaCardHeader>

        <MafiaCardContent className="space-y-0 p-0 text-center">
          <RoleExplanation role={role} />
          {abilityLines.length > 0 && (
            <RoleAbilitiesList lines={abilityLines} />
          )}
          <RoleOathFooter locked={locked} />

          {!locked && role.pendingAcknowledge && onAcknowledge && (
            <MafiaButton
              variant="primary"
              className="mt-3 w-full min-h-10"
              onClick={onAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging ?
                '…'
              : <span className="inline-flex flex-col gap-0.5 leading-tight">
                  <span dir="rtl">تمام، فهمت دوري</span>
                  <span className="text-[0.7rem] font-normal normal-case tracking-normal opacity-90">
                    I have read my role
                  </span>
                </span>
              }
            </MafiaButton>
          )}
        </MafiaCardContent>
      </MafiaCard>
    </TooltipProvider>
  );
}
