'use client';

import clsx from 'clsx';
import type { TavernRoleView } from '../types';
import { roleThemeStyleFromRole } from '../lib/roleTheme';

interface RoleRevealCardProps {
  role: TavernRoleView;
  onAcknowledge?: () => void;
  acknowledging?: boolean;
}

export default function RoleRevealCard({
  role,
  onAcknowledge,
  acknowledging = false,
}: RoleRevealCardProps) {
  const locked = !role.pendingAcknowledge;

  return (
    <div
      className={clsx(
        'tc-role-tome',
        'tc-role-tome--enter',
        locked && 'tc-role-tome--acknowledged'
      )}
      style={roleThemeStyleFromRole(role.id, role.accentColor)}
      role="region"
      aria-label="Your secret role"
    >
      <div className="tc-role-tome__seal-wrap">
        <div className="tc-role-tome__seal-glow" aria-hidden />
        <span aria-hidden>{role.icon}</span>
      </div>
      <p className="tc-role-tome__ar tc-font-display" dir="rtl">
        {role.nameAr}
      </p>
      <h2 className="tc-role-tome__title tc-font-display">{role.nameEn}</h2>
      {!locked && (
        <>
          <p className="text-sm tc-muted mb-1" dir="rtl">
            {role.descriptionAr}
          </p>
          <p className="text-sm tc-muted mb-4">{role.descriptionEn}</p>
          {role.pendingAcknowledge && onAcknowledge && (
            <button
              type="button"
              className="tc-btn-royal w-full"
              onClick={onAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging ? '…' : 'I have read my role'}
            </button>
          )}
        </>
      )}

      {locked && (
        <div className="tc-oath-locked">
          <div className="tc-rune-sigil" aria-hidden />
          <p className="tc-oath-locked__word tc-font-display">{role.nameEn}</p>
          <p className="tc-oath-locked__status">Oath sealed — await the narrator</p>
        </div>
      )}
    </div>
  );
}
