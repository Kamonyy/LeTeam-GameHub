import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import '@/app/hub-arcade.css';

const SketchDrawClient = dynamic(() => import('@/games/sketch-draw/SketchDrawClient'), {
  loading: () => <HubGameLoadingScreen gameId="sketch-draw" />,
});

export default function SketchDrawPage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="sketch-draw" />}>
      <SketchDrawClient />
    </Suspense>
  );
}
