'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SpotifyProvider } from '@/contexts/SpotifyContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
