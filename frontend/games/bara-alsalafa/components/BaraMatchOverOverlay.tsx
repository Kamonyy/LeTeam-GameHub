'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type { LobbyState } from '@/lib/hub/types';

interface BaraMatchOverOverlayProps {
  gameState: BaraGameState;
  lobby: LobbyState;
  isHost: boolean;
  busy?: boolean;
  onReturnToLobby: () => void;
  onDisbandRoom: () => void;
  onLeave: () => void;
}

function displayName(lobby: LobbyState, id: string) {
  return lobby.players.find((p) => p.id === id)?.displayName ?? 'لاعب';
}

export default function BaraMatchOverOverlay({
  gameState,
  lobby,
  isHost,
  busy = false,
  onReturnToLobby,
  onDisbandRoom,
  onLeave,
}: BaraMatchOverOverlayProps) {
  const [visible, setVisible] = useState(false);

  const standings = useMemo(() => {
    return [...lobby.players].sort(
      (a, b) => (gameState.scores[b.id] ?? 0) - (gameState.scores[a.id] ?? 0)
    );
  }, [lobby.players, gameState.scores]);

  const winningSide =
    gameState.outcastRoundWins > gameState.insiderRoundWins ?
      'outcast'
    : gameState.insiderRoundWins > gameState.outcastRoundWins ?
      'insiders'
    : null;

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const winnerName =
    gameState.winnerId ? displayName(lobby, gameState.winnerId) : null;

  return (
    <div
      className="bara-match-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bara-match-over-title"
    >
      <div
        className={clsx(
          'bara-match-over-modal',
          visible && 'bara-match-over-modal--in'
        )}
      >
        <div className="bara-match-over-modal__head">
          <Trophy className="w-8 h-8 text-amber-400 shrink-0" aria-hidden />
          <h2 id="bara-match-over-title" className="bara-match-over-modal__title">
            انتهت المباراة!
          </h2>
        </div>

        <p className="bara-match-over-modal__teams tabular-nums">
          الداخلون {gameState.insiderRoundWins}/{gameState.roundsToWin} · برا السالفة{' '}
          {gameState.outcastRoundWins}/{gameState.roundsToWin}
          {winningSide === 'insiders' ?
            ' — فاز فريق الداخلين'
          : winningSide === 'outcast' ?
            ' — فاز برا السالفة'
          :	''}
        </p>

        {winnerName && (
          <p className="bara-match-over-modal__winner">
            أفضل لاعب (نقاط): <strong>{winnerName}</strong>
          </p>
        )}

        {gameState.revealedSecretWord && (
          <p className="bara-match-over-modal__word">
            الكلمة كانت: <strong>{gameState.revealedSecretWord}</strong>
          </p>
        )}

        <ul className="bara-match-over-scores" aria-label="النقاط النهائية">
          {standings.map((player, index) => (
            <li
              key={player.id}
              className={clsx(
                'bara-match-over-scores__row',
                player.id === gameState.winnerId && 'bara-match-over-scores__row--winner'
              )}
            >
              <span className="bara-match-over-scores__rank tabular-nums">
                {index + 1}
              </span>
              <span className="bara-match-over-scores__name truncate">
                {player.displayName}
              </span>
              <span className="bara-match-over-scores__pts tabular-nums">
                {gameState.scores[player.id] ?? 0} نقطة
              </span>
            </li>
          ))}
        </ul>

        <div className="bara-match-over-actions">
          {isHost ?
            <>
              <button
                type="button"
                className="bara-btn-primary w-full"
                disabled={busy}
                onClick={onReturnToLobby}
              >
                {busy ? 'جاري المعالجة…' : 'العودة للوبي مع اللاعبين'}
              </button>
              <button
                type="button"
                className="bara-btn-secondary w-full bara-match-over-actions__exit"
                disabled={busy}
                onClick={onDisbandRoom}
              >
                إغلاق الغرفة — الجميع للصفحة الرئيسية
              </button>
            </>
          : <>
              <p className="bara-match-over-modal__wait">
                بانتظار قرار المضيف…
              </p>
              <button
                type="button"
                className="bara-btn-secondary w-full"
                disabled={busy}
                onClick={onLeave}
              >
                مغادرة إلى الرئيسية
              </button>
            </>
          }
        </div>
      </div>
    </div>
  );
}
