import { Suspense } from 'react';
import MafiaLegacyRedirect from './redirect-client';

export default function MafiaRedirectPage() {
  return (
    <Suspense fallback={null}>
      <MafiaLegacyRedirect />
    </Suspense>
  );
}
