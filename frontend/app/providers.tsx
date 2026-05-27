'use client';

import { SocketProvider } from '@/lib/hub/SocketProvider.jsx';
import StuckResetButton from '@/components/shared/StuckResetButton';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <StuckResetButton />
      {children}
    </SocketProvider>
  );
}
