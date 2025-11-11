'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStoredAccessToken, storeAccessToken, clearAccessToken } from '@/lib/spotify';

interface SpotifyContextType {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token on mount
    const stored = getStoredAccessToken();
    if (stored) {
      setAccessTokenState(stored);
    }
  }, []);

  const setAccessToken = (token: string) => {
    storeAccessToken(token);
    setAccessTokenState(token);
  };

  const logout = () => {
    clearAccessToken();
    setAccessTokenState(null);
  };

  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        setAccessToken,
        logout,
        isAuthenticated: !!accessToken,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within SpotifyProvider');
  }
  return context;
}
