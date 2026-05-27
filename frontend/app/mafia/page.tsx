import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import '@/app/hub-arcade.css';

const TavernCouncilClient = dynamic(
  () => import('@/games/tavern-council/TavernCouncilClient'),
  {
    loading: () => <HubGameLoadingScreen gameId="mafia" />,
  }
);

export default function MafiaPage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="mafia" />}>
      <TavernCouncilClient />
    </Suspense>
  );
}
