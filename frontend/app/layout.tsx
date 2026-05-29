import type { Metadata, Viewport } from 'next';
import './globals.css';
import './hub-arcade.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'LeTeam Game Hub',
  description: 'Real-time multiplayer game platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
