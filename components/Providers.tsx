'use client';

import { SpotifyProvider } from '@/contexts/SpotifyContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SpotifyProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </SpotifyProvider>
  );
}
