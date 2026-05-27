'use client';

import { SocketProvider } from '@/lib/hub/SocketProvider.jsx';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
