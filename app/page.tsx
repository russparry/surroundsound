'use client';

import { useState } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { redirectToSpotifyAuthorize } from '@/lib/spotify';

export default function Home() {
  const { isAuthenticated, logout } = useSpotify();
  const [roomCode, setRoomCode] = useState('');
  const router = useRouter();

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

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl font-bold mb-4">SyncSound</h1>
        <p className="text-xl mb-8 text-gray-600 text-center max-w-2xl">
          Create a surround sound experience with your friends
        </p>

        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-semibold mb-4 text-center">Get Started</h2>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="font-semibold mb-2">Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Spotify Premium account</li>
              <li>Each person needs their own account</li>
              <li>Works on any device with a browser</li>
            </ul>
          </div>

          <button
            onClick={handleLogin}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Login with Spotify
          </button>

          <p className="mt-4 text-sm text-gray-500 text-center">
            You'll be redirected to Spotify to authorize
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4">
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Logout
        </button>
      </div>

      <h1 className="text-5xl font-bold mb-8">SyncSound</h1>

      <div className="flex flex-col gap-8 w-full max-w-md">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Create Room</h2>
          <p className="text-gray-600 mb-4">
            Start a new listening session and invite your friends
          </p>
          <button
            onClick={handleCreateRoom}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Create Room
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Join Room</h2>
          <p className="text-gray-600 mb-4">
            Enter the room code from your friend
          </p>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Join Room
          </button>
        </div>
      </div>
    </main>
  );
}
