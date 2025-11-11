'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSpotify } from '@/contexts/SpotifyContext';
import { useSocket } from '@/contexts/SocketContext';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<any>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(position: number): Promise<void>;
  _options: { getOAuthToken: (cb: (token: string) => void) => void; id: string };
}

namespace Spotify {
  export class Player implements SpotifyPlayer {
    constructor(options: any);
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, callback: (...args: any[]) => void): void;
    removeListener(event: string): void;
    getCurrentState(): Promise<any>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position: number): Promise<void>;
    _options: { getOAuthToken: (cb: (token: string) => void) => void; id: string };
  }
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accessToken, isAuthenticated } = useSpotify();
  const { socket, isConnected } = useSocket();

  const roomCode = params.code as string;
  const isHost = searchParams.get('host') === 'true';

  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: `SyncSound - ${roomCode}`,
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);
      });

      player.connect();
      setPlayer(player);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken, roomCode]);

  // Socket.io room setup
  useEffect(() => {
    if (!socket || !isConnected || !isReady) return;

    if (isHost) {
      socket.emit('create-room', { roomCode, userId: 'user-' + Date.now() });
    } else {
      socket.emit('join-room', { roomCode, userId: 'user-' + Date.now() });
    }

    socket.on('room-created', () => {
      console.log('Room created successfully');
    });

    socket.on('room-joined', () => {
      console.log('Joined room successfully');
    });

    socket.on('member-joined', ({ memberCount: count }: { memberCount: number }) => {
      setMemberCount(count);
    });

    socket.on('member-left', ({ memberCount: count }: { memberCount: number }) => {
      setMemberCount(count);
    });

    socket.on('host-left', () => {
      alert('Host has left the room');
      router.push('/');
    });

    socket.on('error', ({ message }: { message: string }) => {
      alert(message);
      router.push('/');
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('member-joined');
      socket.off('member-left');
      socket.off('host-left');
      socket.off('error');
    };
  }, [socket, isConnected, isReady, isHost, roomCode, router]);

  // Playback commands from host
  useEffect(() => {
    if (!socket || !player || !deviceId) return;

    socket.on('play-command', async ({ trackUri, position: pos, timestamp }: any) => {
      const latency = Date.now() - timestamp;
      const adjustedPosition = pos + latency;

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uris: [trackUri],
          position_ms: adjustedPosition,
        }),
      });

      // Start drift correction
      startSyncInterval();
    });

    socket.on('pause-command', () => {
      player.pause();
      stopSyncInterval();
    });

    socket.on('resume-command', async ({ position: pos, timestamp }: any) => {
      const latency = Date.now() - timestamp;
      const adjustedPosition = pos + latency;

      await player.seek(adjustedPosition);
      await player.resume();
      startSyncInterval();
    });

    socket.on('seek-command', async ({ position: pos, timestamp }: any) => {
      const latency = Date.now() - timestamp;
      const adjustedPosition = pos + latency;
      await player.seek(adjustedPosition);
    });

    socket.on('sync-position', async ({ position: hostPosition }: any) => {
      const state = await player.getCurrentState();
      if (!state) return;

      const myPosition = state.position;
      const drift = Math.abs(myPosition - hostPosition);

      // Re-sync if drift is more than 100ms
      if (drift > 100) {
        console.log(`Drift detected: ${drift}ms, re-syncing...`);
        await player.seek(hostPosition);
      }
    });

    return () => {
      socket.off('play-command');
      socket.off('pause-command');
      socket.off('resume-command');
      socket.off('seek-command');
      socket.off('sync-position');
    };
  }, [socket, player, deviceId, accessToken]);

  // Drift correction interval (for host)
  const startSyncInterval = () => {
    if (syncIntervalRef.current) return;

    syncIntervalRef.current = setInterval(async () => {
      if (!player || !isHost) return;

      const state = await player.getCurrentState();
      if (state && !state.paused && socket) {
        socket.emit('position-update', { roomCode, position: state.position });
      }
    }, 2000);
  };

  const stopSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  // Search for tracks
  const handleSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return;

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    setSearchResults(data.tracks?.items || []);
  };

  // Play a track (host only)
  const handlePlayTrack = (track: any) => {
    if (!isHost || !socket || !deviceId) return;

    socket.emit('play-track', {
      roomCode,
      trackId: track.id,
      trackUri: track.uri,
      position: 0,
    });
  };

  // Pause (host only)
  const handlePause = () => {
    if (!isHost || !socket) return;
    socket.emit('pause', { roomCode });
  };

  // Resume (host only)
  const handleResume = async () => {
    if (!isHost || !socket || !player) return;

    const state = await player.getCurrentState();
    if (state) {
      socket.emit('resume', { roomCode, position: state.position });
    }
  };

  if (!isAuthenticated) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Room: {roomCode}</h1>
            <p className="text-gray-600 mt-2">
              {isHost ? 'You are the host' : 'Listening mode'} | {memberCount} member(s)
            </p>
            {!isReady && <p className="text-yellow-600 mt-2">Connecting to Spotify...</p>}
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Leave Room
          </button>
        </div>

        {/* Current Track */}
        {currentTrack && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
            <div className="flex items-center gap-4">
              {currentTrack.album?.images?.[0] && (
                <img
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.name}
                  className="w-24 h-24 rounded"
                />
              )}
              <div>
                <p className="text-xl font-bold">{currentTrack.name}</p>
                <p className="text-gray-600">
                  {currentTrack.artists?.map((a: any) => a.name).join(', ')}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                </p>
              </div>
            </div>

            {isHost && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={isPlaying ? handlePause : handleResume}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isPlaying ? 'Pause' : 'Resume'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search (host only) */}
        {isHost && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Search & Play</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a song..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="flex items-center gap-3">
                      {track.album?.images?.[2] && (
                        <img
                          src={track.album.images[2].url}
                          alt={track.name}
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{track.name}</p>
                        <p className="text-sm text-gray-600">
                          {track.artists.map((a: any) => a.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Play
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isHost && !currentTrack && (
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="text-gray-600">Waiting for host to play a track...</p>
          </div>
        )}
      </div>
    </div>
  );
}
