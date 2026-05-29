'use client';

import { SocketProvider } from '@/lib/hub/SocketProvider.jsx';
import { ViewTransitionProvider } from '@/lib/hub/ViewTransitionProvider';
import { ClientStorageProvider } from '@/lib/session/ClientStorageContext';
import StuckResetButton from '@/components/shared/StuckResetButton';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientStorageProvider>
      <ViewTransitionProvider>
        <SocketProvider>
          <StuckResetButton />
          {children}
        </SocketProvider>
      </ViewTransitionProvider>
    </ClientStorageProvider>
  );
}
