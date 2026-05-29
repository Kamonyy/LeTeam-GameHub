import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';

const MafiaClient = dynamic(
  () => import('@/games/mafia/MafiaClient'),
  {
    loading: () => <HubGameLoadingScreen gameId="mafia" />,
  }
);

export default function MafiaPage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="mafia" />}>
      <MafiaClient />
    </Suspense>
  );
}
