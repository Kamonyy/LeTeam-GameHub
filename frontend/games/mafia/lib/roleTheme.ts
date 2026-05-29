import type { CSSProperties } from 'react';
import { getRole, getRoleAccent } from '@shared/games/mafia/roles.js';

/** CSS custom property set on role-themed surfaces */
export const MF_ROLE_ACCENT_VAR = '--mf-role-accent';

export function resolveRoleAccent(
  roleId?: string | null,
  accentOverride?: string | null
): string {
  if (accentOverride) return accentOverride;
  return getRoleAccent(roleId ?? undefined);
}

/** Inline style object that sets `--mf-role-accent` for descendant CSS */
export function roleThemeStyle(accentColor: string): CSSProperties {
  return { [MF_ROLE_ACCENT_VAR]: accentColor } as CSSProperties;
}

export function roleThemeStyleFromRole(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  return roleThemeStyle(resolveRoleAccent(roleId, accentOverride));
}

const ROLE_BADGE_BG_SOLID =
  'radial-gradient(circle at 35% 28%, #4a4238 0%, #221e18 52%, #100e0c 100%)';
/** Raised badge behind role emoji — high contrast on dark panels */
export function roleIconBadgeStyle(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  const accent = resolveRoleAccent(roleId, accentOverride);
  const badgeBgTinted = `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${accent} 38%, #4a4238) 0%, color-mix(in srgb, ${accent} 28%, #221e18) 52%, #100e0c 100%)`;
  return {
    background: `${ROLE_BADGE_BG_SOLID}, ${badgeBgTinted}`,
    borderColor: '#f0dcb4',
    boxShadow: [
      `inset 0 0 0 1px #f0dcb4`,
      `inset 0 0 0 1px color-mix(in srgb, ${accent} 70%, #f0dcb4)`,
      'inset 0 2px 0 rgba(255, 235, 200, 0.32)',
      'inset 0 -4px 10px rgba(0, 0, 0, 0.42)',
      `0 0 22px -4px ${accent}94`,
      `0 0 22px -4px color-mix(in srgb, ${accent} 58%, transparent)`,
    ].join(', '),
  };
}

/** Solid role-color dot with a light glow. Use class `mf-role-dot`. */
export function roleDotStyle(roleId?: string | null): CSSProperties {
  const accent = resolveRoleAccent(roleId);
  return {
    backgroundColor: accent,
    boxShadow: `0 0 5px 1px color-mix(in srgb, ${accent} 30%, transparent)`,
  };
}

/** Seat color when role is hidden (public player list). */
export function seatColorDotStyle(seatColor: string): CSSProperties {
  return {
    backgroundColor: seatColor,
    boxShadow: `0 0 5px 1px color-mix(in srgb, ${seatColor} 30%, transparent)`,
  };
}

/** Left border / emphasis using the role accent (not generic good/evil). */
export function roleBorderAccentStyle(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  const accent = resolveRoleAccent(roleId, accentOverride);
  return {
    borderLeftColor: accent,
    borderLeftWidth: '4px',
  };
}

export interface RoleAbilityLine {
  en: string;
  ar: string;
}

/** Ability + restriction lines (EN + AR) for role reveal UI */
export function roleAbilityLines(roleId?: string | null): RoleAbilityLine[] {
  const role = getRole(roleId ?? '');
  if (!role) return [];

  const lines: RoleAbilityLine[] = [];
  const abilitiesAr = role.abilitiesAr ?? [];

  role.abilities.forEach((en, index) => {
    lines.push({ en, ar: abilitiesAr[index] ?? en });
  });

  const restrictionsAr = role.restrictionsAr ?? [];
  role.restrictions.forEach((en, index) => {
    const ar = restrictionsAr[index] ?? en;
    lines.push({
      en: `Restriction: ${en}`,
      ar: `ممنوع: ${ar}`,
    });
  });

  return lines;
}

/** English-only lines for compact tooltips */
export function roleAbilityTooltipLines(roleId?: string | null): string[] {
  return roleAbilityLines(roleId).map((line) => line.en);
}

export function roleAbilityTooltipText(roleId?: string | null): string | null {
  const lines = roleAbilityTooltipLines(roleId);
  return lines.length > 0 ? lines.join('\n') : null;
}
