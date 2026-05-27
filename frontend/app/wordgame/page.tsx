import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import '@/app/hub-arcade.css';

const WordGameClient = dynamic(() => import('@/games/wordgame/WordGameClient'), {
  loading: () => <HubGameLoadingScreen gameId="wordgame" />,
});

export default function WordGamePage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="wordgame" />}>
      <WordGameClient />
    </Suspense>
  );
}
