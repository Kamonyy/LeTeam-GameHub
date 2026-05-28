'use client';

import clsx from 'clsx';
import { Mic, Link2, Scroll, MessageCircleQuestion, Trophy } from 'lucide-react';

const STEPS = [
  {
    icon: Mic,
    title: 'Play on voice',
    body: 'Exactly 2 players in the same call (Discord, Zoom, or in person). Questions and answers happen out loud.',
  },
  {
    icon: Link2,
    title: 'Share the room',
    body: 'Host creates a lobby and sends the link. Your friend joins the same room before you start.',
  },
  {
    icon: Scroll,
    title: 'Pick the secret',
    body: 'In the lobby, choose Custom words or League champions. The word-picker sets the secret; the guesser never sees it early.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Ask, then confirm',
    body: 'Guesser asks yes/no questions. When ready, submit guesses in the app — each correct hit scores a point.',
  },
  {
    icon: Trophy,
    title: 'Win the match',
    body: 'First player to the lobby score limit wins. Play again from the lobby or head back to the hub.',
  },
] as const;

interface WordGameHowToPlayProps {
  className?: string;
}

export default function WordGameHowToPlay({ className }: WordGameHowToPlayProps) {
  return (
    <ol className={clsx('sw-howto-list', className)}>
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="sw-howto-step">
            <span className="sw-howto-step__rail" aria-hidden>
              <span className="sw-howto-step__num">{index + 1}</span>
              {index < STEPS.length - 1 && <span className="sw-howto-step__line" />}
            </span>
            <div className="sw-howto-step__body">
              <div className="sw-howto-step__title-row">
                <Icon className="sw-howto-step__icon" aria-hidden strokeWidth={1.75} />
                <p className="sw-howto-step__title">{step.title}</p>
              </div>
              <p className="sw-howto-step__text">{step.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
