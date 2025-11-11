'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSpotify } from '@/contexts/SpotifyContext';
import { getAccessToken } from '@/lib/spotify';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken } = useSpotify();

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      getAccessToken(code)
        .then((token) => {
          setAccessToken(token);
          router.push('/');
        })
        .catch((error) => {
          console.error('Auth error:', error);
          router.push('/?error=auth_failed');
        });
    } else {
      router.push('/?error=no_code');
    }
  }, [searchParams, setAccessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating with Spotify...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
