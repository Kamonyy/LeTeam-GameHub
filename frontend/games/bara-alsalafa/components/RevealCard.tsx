'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Eye, Lock } from 'lucide-react';
import type { BaraGameState } from '@/games/bara-alsalafa/types';

interface RevealCardProps {
  gameState: BaraGameState;
  onReveal: () => void;
  revealing?: boolean;
}

export default function RevealCard({ gameState, onReveal, revealing = false }: RevealCardProps) {
  const [flipped, setFlipped] = useState(!!gameState.roleView);
  const [lockLifted, setLockLifted] = useState(!!gameState.roleView);
  const role = gameState.roleView;

  useEffect(() => {
    if (gameState.roleView) {
      setFlipped(true);
      setLockLifted(true);
    }
  }, [gameState.roleView]);

  const handleReveal = () => {
    if (!gameState.canReveal || revealing) return;
    setLockLifted(true);
    setTimeout(() => {
      setFlipped(true);
      onReveal();
    }, 280);
  };

  return (
    <div className="bara-reveal-stage flex flex-col items-center gap-6" dir="rtl">
      <div
        className={clsx(
          'bara-flip-card',
          flipped && 'bara-flip-card--flipped',
          !lockLifted && 'bara-flip-card--locked'
        )}
      >
        {!lockLifted && (
          <div className="bara-lock-layer absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70 backdrop-blur-md">
            <Lock className="w-10 h-10 text-hub-muted" />
            <p className="text-sm text-hub-muted px-6 text-center">
              اضغط للكشف — لا تُظهر الشاشة للآخرين
            </p>
          </div>
        )}

        <div className="bara-flip-card__inner">
          <div className="bara-flip-card__face bara-flip-card__back flex flex-col items-center justify-center gap-4 p-8">
            <span className="text-6xl">🂠</span>
            <p className="text-lg font-semibold text-hub-muted">بطاقة سرية</p>
            {gameState.canReveal && (
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing}
                className="btn-primary flex items-center gap-2 mt-2"
              >
                <Eye className="w-4 h-4" />
                {revealing ? 'جاري الكشف…' : 'اكشف هويتك'}
              </button>
            )}
            {!gameState.canReveal && !role && (
              <p className="text-sm text-hub-success">انتظر بقية اللاعبين…</p>
            )}
          </div>

          <div className="bara-flip-card__face bara-flip-card__front flex flex-col items-center justify-center gap-4 p-8 text-center">
            {role && (
              <>
                <span className="bara-category-badge">{role.categoryName}</span>
                {role.isOutcast ? (
                  <div className="bara-outcast-block animate-bara-vibrate">
                    {role.outcastMessage}
                  </div>
                ) : (
                  <p className="text-3xl font-black text-white tracking-wide">
                    {role.secretWord}
                  </p>
                )}
                <p className="text-xs text-hub-muted max-w-xs">
                  {role.isOutcast ?
                    'اندمج مع الإجابات دون أن تُفضح نفسك'
                  :	'تذكّر الكلمة — لا تُفضحها أثناء الأسئلة'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
