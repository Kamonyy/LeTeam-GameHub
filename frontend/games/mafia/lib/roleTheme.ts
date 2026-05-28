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

/** Raised badge behind role emoji — high contrast on dark panels */
export function roleIconBadgeStyle(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  const accent = resolveRoleAccent(roleId, accentOverride);
  return {
    background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${accent} 38%, #4a4238) 0%, color-mix(in srgb, ${accent} 28%, #221e18) 52%, #100e0c 100%)`,
    borderColor: `color-mix(in srgb, ${accent} 70%, #f0dcb4)`,
    boxShadow: `inset 0 2px 0 rgba(255, 235, 200, 0.32), inset 0 -4px 10px rgba(0, 0, 0, 0.42), 0 0 22px -4px color-mix(in srgb, ${accent} 58%, transparent)`,
  };
}

/** Small roster / chip dot — role tint with a lit center */
export function roleDotStyle(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  const accent = resolveRoleAccent(roleId, accentOverride);
  return {
    background: `radial-gradient(circle at 38% 32%, color-mix(in srgb, ${accent} 55%, #e5dcc8) 0%, color-mix(in srgb, ${accent} 90%, #3d3428) 100%)`,
    boxShadow: `0 0 8px color-mix(in srgb, ${accent} 45%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.28)`,
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

/** Ability + restriction lines for role ability tooltips */
export function roleAbilityTooltipLines(roleId?: string | null): string[] {
  const role = getRole(roleId ?? '');
  if (!role) return [];

  const lines: string[] = [];
  if (role.abilities.length > 0) {
    lines.push(...role.abilities);
  }
  if (role.restrictions.length > 0) {
    for (const restriction of role.restrictions) {
      lines.push(`Restriction: ${restriction}`);
    }
  }
  return lines;
}

export function roleAbilityTooltipText(roleId?: string | null): string | null {
  const lines = roleAbilityTooltipLines(roleId);
  return lines.length > 0 ? lines.join('\n') : null;
}
