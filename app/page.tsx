'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSpotify } from '@/contexts/SpotifyContext';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { redirectToSpotifyAuthorize } from '@/lib/spotify';

export default function Home() {
  const { user, userProfile, loading: authLoading, signOut } = useAuth();
  const { accessToken, logout: logoutSpotify } = useSpotify();
  const [roomCode, setRoomCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if in guest mode
    if (typeof window !== 'undefined') {
      const guestMode = localStorage.getItem('guest_mode') === 'true';
      setIsGuestMode(guestMode);

      // Only redirect to login if not authenticated AND not in guest mode
      if (!authLoading && !user && !guestMode) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const handleCreateRoom = () => {
    const code = nanoid(6).toUpperCase();
    router.push(`/room/${code}?host=true`);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.toUpperCase()}`);
    }
  };

  const handleLogin = () => {
    redirectToSpotifyAuthorize();
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      // Clear guest mode and Spotify token
      localStorage.removeItem('guest_mode');
      logoutSpotify();
      router.push('/login');
    } else {
      // Normal logout
      await signOut();
      logoutSpotify();
      router.push('/login');
    }
  };

  // Show loading state (only if not in guest mode)
  if (authLoading && !isGuestMode) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600">
        <div className="text-white text-2xl">Loading...</div>
      </main>
    );
  }

  // If not logged in and not guest mode, redirect will happen via useEffect
  if (!user && !isGuestMode) {
    return null;
  }

  // Get display name (user's name or "Guest")
  const displayName = userProfile?.full_name || 'Guest';

  // Check if user has connected Spotify
  if (!accessToken) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600">
        {/* Logout button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-white/20 transition text-sm"
          >
            Logout
          </button>
        </div>

        {/* Music Note Icon */}
        <div className="mb-8">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold text-white mb-4">SyncSound</h1>
        <p className="text-xl text-white/90 mb-4">Welcome, {displayName}!</p>
        <p className="text-lg text-white/80 mb-12">Connect your Spotify to continue</p>

        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="space-y-6">
            {/* Connect with Spotify Button */}
            <button
              onClick={handleLogin}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition font-semibold text-lg shadow-lg"
            >
              Connect with Spotify
            </button>

            {/* Footer Text */}
            <p className="text-center text-white/70 text-sm">
              Spotify Premium required
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 relative">
      {/* Logout button - hidden in top right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-white/20 transition text-sm"
        >
          Logout
        </button>
      </div>

      {/* Music Note Icon */}
      <div className="mb-6">
        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>

      {/* Welcome Message */}
      <h1 className="text-5xl font-bold text-white mb-2">Welcome, {displayName}!</h1>
      <p className="text-xl text-white/90 mb-12">Ready to share the vibe?</p>

      {/* Action Cards */}
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        {/* Create Room Card */}
        <button
          onClick={handleCreateRoom}
          className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-pink-400/30 rounded-2xl flex items-center justify-center group-hover:bg-pink-400/40 transition">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-3xl font-bold text-white mb-1">Create Room</h2>
              <p className="text-white/70">Host a listening session</p>
            </div>
          </div>
        </button>

        {/* Join Room Card */}
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-400/30 rounded-2xl flex items-center justify-center group-hover:bg-blue-400/40 transition">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-3xl font-bold text-white mb-1">Join Room</h2>
                <p className="text-white/70">Enter a room code</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-16 h-16 bg-blue-400/30 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-3xl font-bold text-white mb-1">Join Room</h2>
                <p className="text-white/70">Enter a room code</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                className="flex-1 px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition uppercase"
                maxLength={6}
                autoFocus
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="px-8 py-4 bg-blue-400/80 hover:bg-blue-400 text-white rounded-2xl transition font-semibold disabled:bg-white/20 disabled:cursor-not-allowed"
              >
                Join
              </button>
              <button
                onClick={() => {
                  setShowJoinInput(false);
                  setRoomCode('');
                }}
                className="px-4 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
