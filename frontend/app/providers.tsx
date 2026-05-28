'use client';

import { SocketProvider } from '@/lib/hub/SocketProvider.jsx';
import { ClientStorageProvider } from '@/lib/session/ClientStorageContext';
import StuckResetButton from '@/components/shared/StuckResetButton';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientStorageProvider>
      <SocketProvider>
        <StuckResetButton />
        {children}
      </SocketProvider>
    </ClientStorageProvider>
  );
}
