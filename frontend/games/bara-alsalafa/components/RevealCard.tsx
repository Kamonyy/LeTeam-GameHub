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
    <div className="bara-reveal-stage" dir="rtl">
      <div className="bara-stage-panel bara-reveal-panel">
        <p className="bara-reveal-panel__hint">بطاقة سرية — لا تُظهر الشاشة للآخرين</p>
        <div
          className={clsx('bara-flip-card', flipped && 'bara-flip-card--flipped')}
        >
          <div className="bara-flip-card__inner">
            {!lockLifted && (
              <button
                type="button"
                className="bara-lock-layer flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/75 backdrop-blur-md border-0 cursor-pointer"
                onClick={handleReveal}
                disabled={!gameState.canReveal || revealing}
                aria-label="اكشف هويتك"
              >
                <Lock className="w-9 h-9 text-rose-200/80" aria-hidden />
                <span className="text-sm text-rose-100/90 px-4 text-center leading-relaxed">
                  {gameState.canReveal ?
                    'اضغط للكشف'
                  :	'انتظر بقية اللاعبين…'}
                </span>
              </button>
            )}

            <div className="bara-flip-card__face bara-flip-card__back flex flex-col items-center justify-center gap-3 p-6">
              <span className="bara-reveal-panel__icon" aria-hidden>
                🂠
              </span>
              <p className="text-base font-semibold text-hub-muted">بطاقة سرية</p>
              {gameState.canReveal && lockLifted && (
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={revealing}
                  className="bara-btn-primary flex items-center gap-2 mt-1"
                >
                  <Eye className="w-4 h-4" aria-hidden />
                  {revealing ? 'جاري الكشف…' : 'اكشف هويتك'}
                </button>
              )}
              {!gameState.canReveal && !role && (
                <p className="text-sm text-emerald-300/90">انتظر بقية اللاعبين…</p>
              )}
            </div>

            <div className="bara-flip-card__face bara-flip-card__front flex flex-col items-center justify-center gap-3 p-6 text-center">
              {role && (
                <>
                  <span className="bara-category-badge">{role.categoryName}</span>
                  {role.isOutcast ? (
                    <div className="bara-outcast-block animate-bara-vibrate">
                      {role.outcastMessage}
                    </div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                      {role.secretWord}
                    </p>
                  )}
                  <p className="text-xs text-hub-muted max-w-xs leading-relaxed">
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
    </div>
  );
}
