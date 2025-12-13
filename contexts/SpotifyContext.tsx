'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStoredAccessToken, storeAccessToken, clearAccessToken, refreshAccessToken } from '@/lib/spotify';

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

    // Check if token needs refreshing on mount
    const checkAndRefresh = async () => {
      const timestamp = localStorage.getItem('spotify_token_timestamp');
      if (!timestamp) return;

      const age = Date.now() - parseInt(timestamp);
      const fortyFiveMinutes = 45 * 60 * 1000;

      // If token is older than 45 minutes, refresh it
      if (age > fortyFiveMinutes) {
        console.log('Token is old, attempting refresh...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessTokenState(newToken);
          console.log('✓ Token refreshed successfully');
        } else {
          console.log('⚠️ Token refresh failed, clearing tokens');
          logout();
        }
      }
    };

    checkAndRefresh();

    // Check every 5 minutes if token needs refreshing
    const interval = setInterval(async () => {
      const timestamp = localStorage.getItem('spotify_token_timestamp');
      if (!timestamp) return;

      const age = Date.now() - parseInt(timestamp);
      const fortyFiveMinutes = 45 * 60 * 1000;

      if (age > fortyFiveMinutes) {
        console.log('Token expiring soon, refreshing...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessTokenState(newToken);
          console.log('✓ Token auto-refreshed');
        } else {
          console.log('⚠️ Auto-refresh failed');
          logout();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const setAccessToken = (token: string) => {
    storeAccessToken(token);
    localStorage.setItem('spotify_token_timestamp', Date.now().toString());
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
