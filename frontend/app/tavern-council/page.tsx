import { Suspense } from 'react';
import TavernCouncilLegacyRedirect from './redirect-client';

export default function TavernCouncilRedirectPage() {
  return (
    <Suspense fallback={null}>
      <TavernCouncilLegacyRedirect />
    </Suspense>
  );
}
