'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Legacy route — game is now `/mafia`. */
export default function MafiaLegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const room = searchParams.get('room');
    router.replace(room ? `/mafia?room=${room}` : '/mafia');
  }, [router, searchParams]);

  return null;
}
