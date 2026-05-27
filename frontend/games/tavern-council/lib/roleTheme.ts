import type { CSSProperties } from 'react';
import { getRoleAccent } from '@shared/games/tavern-council/roles.js';

/** CSS custom property set on role-themed surfaces */
export const TC_ROLE_ACCENT_VAR = '--tc-role-accent';

export function resolveRoleAccent(
  roleId?: string | null,
  accentOverride?: string | null
): string {
  if (accentOverride) return accentOverride;
  return getRoleAccent(roleId ?? undefined);
}

/** Inline style object that sets `--tc-role-accent` for descendant CSS */
export function roleThemeStyle(accentColor: string): CSSProperties {
  return { [TC_ROLE_ACCENT_VAR]: accentColor } as CSSProperties;
}

export function roleThemeStyleFromRole(
  roleId?: string | null,
  accentOverride?: string | null
): CSSProperties {
  return roleThemeStyle(resolveRoleAccent(roleId, accentOverride));
}
