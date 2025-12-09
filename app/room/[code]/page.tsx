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

declare namespace Spotify {
  class Player implements SpotifyPlayer {
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<'track' | 'playlist' | 'artist'>('track');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Detect iOS device on mount and show warning
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      console.log('⚠️ iOS device detected - Spotify Web Playback SDK has limited support');
      console.log('🔧 Recommendation: Use Safari instead of Chrome, or use desktop/Android');
      setShowIOSWarning(true);
    }
  }, []);

  // Update current playback position for display
  useEffect(() => {
    if (!player) {
      console.log('⚠️ No player available for position updates');
      return;
    }

    console.log('✓ Starting position update interval (every 100ms)');

    const updatePosition = async () => {
      try {
        const state = await player.getCurrentState();
        if (state) {
          setCurrentPosition(state.position);
          // Log player state every 5 seconds for debugging
          if (Math.floor(state.position / 5000) !== Math.floor(currentPosition / 5000)) {
            console.log('Player state:', {
              position: state.position,
              paused: state.paused,
              track: state.track_window?.current_track?.name,
            });
          }
        } else {
          console.warn('⚠️ getCurrentState returned null - player not initialized');
        }
      } catch (error) {
        console.error('Error getting player state:', error);
      }
    };

    // Update position every 100ms for smooth display
    positionIntervalRef.current = setInterval(updatePosition, 100);

    return () => {
      console.log('Cleaning up position update interval');
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [player]);

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

      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);

        // Activate the device by transferring playback to it
        try {
          console.log('Activating device...');
          const activateResponse = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              device_ids: [device_id],
              play: false, // Don't start playing, just activate
            }),
          });

          if (activateResponse.ok) {
            console.log('Device activated successfully');
          } else {
            console.warn('Device activation returned:', activateResponse.status);
          }
        } catch (error) {
          console.warn('Could not activate device (may still work):', error);
        }

        setIsReady(true);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Initialization Error:', message);
        alert('Failed to initialize Spotify player. Make sure you have Spotify Premium.');
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Authentication Error:', message);
        alert('Spotify authentication failed. Please try logging in again.');
      });

      player.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account Error:', message);
        alert('Spotify Premium is required to use this app.');
      });

      player.addListener('playback_error', ({ message }: { message: string }) => {
        console.error('Playback Error:', message);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);

        // Auto-play next track when current track ends (host only)
        if (isHost && state.position === 0 && state.paused && currentTrack && state.track_window.current_track?.id !== currentTrack.id) {
          // Track has changed, likely ended
          if (queue.length > 0) {
            const nextTrack = queue[0];
            handlePlayTrack(nextTrack);
            // Remove from queue after playing
            setQueue(prev => prev.slice(1));
            if (socket) {
              socket.emit('remove-from-queue', { roomCode, index: 0 });
            }
          }
        }
      });

      player.connect().then((success: boolean) => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!');
        } else {
          console.error('The Web Playback SDK could not connect to Spotify');
          alert('Failed to connect to Spotify. Please make sure you have Spotify Premium and try refreshing the page.');
        }
      });

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

    const displayName = isHost ? 'Host' : `Guest-${Math.floor(Math.random() * 1000)}`;

    if (isHost) {
      socket.emit('create-room', { roomCode, userId: 'user-' + Date.now(), displayName });
    } else {
      socket.emit('join-room', { roomCode, userId: 'user-' + Date.now(), displayName });
    }

    socket.on('room-created', () => {
      console.log('Room created successfully');
    });

    socket.on('room-joined', ({ queue: initialQueue, members: initialMembers }: any) => {
      console.log('Joined room successfully');
      if (initialQueue) setQueue(initialQueue);
      if (initialMembers) setMembers(initialMembers);
    });

    socket.on('member-joined', ({ memberCount: count, members: updatedMembers }: any) => {
      setMemberCount(count);
      if (updatedMembers) setMembers(updatedMembers);
    });

    socket.on('member-left', ({ memberCount: count, members: updatedMembers }: any) => {
      setMemberCount(count);
      if (updatedMembers) setMembers(updatedMembers);
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

    socket.on('play-command', async ({ trackUri, position: pos, timestamp, startTime }: any) => {
      const receiveTime = Date.now();
      const latency = receiveTime - timestamp;
      const waitTime = startTime ? (startTime - receiveTime) : 0;
      console.log('📥 Received play-command:', {
        trackUri,
        position: pos,
        deviceId,
        latency: `${latency}ms`,
        timestamp,
        receiveTime,
        startTime,
        waitTime: `${waitTime}ms`,
        isHost: isHost ? 'YES (HOST)' : 'NO (GUEST)'
      });

      // If startTime is provided, show countdown and wait until EXACT start time
      if (startTime) {
        const waitTime = startTime - Date.now();
        console.log(`Waiting ${waitTime}ms before starting playback (synchronized countdown)...`);

        if (waitTime > 0) {
          // Update countdown display based on remaining time
          const countdownInterval = setInterval(() => {
            const remaining = startTime - Date.now();
            const secondsLeft = Math.ceil(remaining / 1000);
            if (secondsLeft > 0) {
              setCountdown(secondsLeft);
            } else {
              setCountdown(null);
              clearInterval(countdownInterval);
            }
          }, 100); // Update every 100ms for smooth countdown

          // Wait until the EXACT startTime (not a fixed duration)
          await new Promise(resolve => setTimeout(resolve, waitTime));
          clearInterval(countdownInterval);
          setCountdown(null);
        }
      }

      const actualStartTime = Date.now();
      const timeDrift = startTime ? (actualStartTime - startTime) : 0;
      console.log(`⏱️ Starting playback NOW. Expected: ${startTime}, Actual: ${actualStartTime}, Drift: ${timeDrift}ms`);

      // No need for position adjustment since all devices start at the same time
      const playPosition = pos;

      try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: playPosition,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Spotify API Error:', response.status, errorText);

          if (response.status === 404) {
            alert('Device not found. Please make sure Spotify is connected.');
          } else if (response.status === 403) {
            alert('Premium required or device not active. Try refreshing the page.');
          } else {
            alert(`Failed to play track: ${response.status}`);
          }
          return;
        }

        console.log('✓ Successfully started synchronized playback at:', new Date().toISOString());
        // Start drift correction
        startSyncInterval();
      } catch (error: any) {
        console.error('Error playing track:', error);

        // Detect Safari/iOS autoplay restriction
        if (error.name === 'NotAllowedError' || error.message?.includes('not allowed')) {
          console.log('Autoplay blocked - requesting user interaction');
          setNeedsUserInteraction(true);
        } else {
          alert('Failed to play track. Check console for details.');
        }
      }
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
      const now = Date.now();

      // Debounce: Only re-sync if at least 500ms has passed since last sync
      // This prevents stuttering from too-frequent corrections (especially on Android)
      const timeSinceLastSync = now - lastSyncTimeRef.current;

      // Re-sync if drift is more than 75ms (balanced for accuracy vs stuttering)
      if (drift > 75 && timeSinceLastSync > 500) {
        console.log(`Drift detected: ${drift}ms, re-syncing to ${hostPosition}ms...`);
        await player.seek(hostPosition);
        lastSyncTimeRef.current = now;
      } else if (drift > 75) {
        console.log(`Drift detected: ${drift}ms, but skipping (last sync was ${timeSinceLastSync}ms ago)`);
      } else if (drift > 0) {
        console.log(`Small drift: ${drift}ms (within tolerance)`);
      }
    });

    // Queue updates
    socket.on('queue-updated', ({ queue: updatedQueue }: any) => {
      setQueue(updatedQueue);
    });

    socket.on('play-next-track', ({ track, queue: updatedQueue }: any) => {
      if (track) {
        handlePlayTrack(track);
        setQueue(updatedQueue);
      }
    });

    socket.on('restart-current-track', async () => {
      if (player) {
        await player.seek(0);
      }
    });

    return () => {
      socket.off('play-command');
      socket.off('pause-command');
      socket.off('resume-command');
      socket.off('seek-command');
      socket.off('sync-position');
      socket.off('queue-updated');
      socket.off('play-next-track');
      socket.off('restart-current-track');
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
    }, 1500); // Balanced at 1500ms to reduce stuttering on mobile devices
  };

  const stopSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  // Search for tracks, playlists, or artists
  const handleSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return;

    // Reset selected playlist/artist when searching
    setSelectedPlaylist(null);
    setSelectedArtist(null);

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (searchType === 'track') {
      setSearchResults(data.tracks?.items || []);
    } else if (searchType === 'playlist') {
      setSearchResults(data.playlists?.items || []);
    } else if (searchType === 'artist') {
      setSearchResults(data.artists?.items || []);
    }
  };

  // Fetch playlist tracks
  const handlePlaylistClick = async (playlist: any) => {
    if (!accessToken) return;

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    setSelectedPlaylist({
      ...playlist,
      tracks: data.items.map((item: any) => item.track).filter((t: any) => t)
    });
  };

  // Fetch artist top tracks
  const handleArtistClick = async (artist: any) => {
    if (!accessToken) return;

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    setSelectedArtist({
      ...artist,
      tracks: data.tracks || []
    });
  };

  // Enable audio (for Safari autoplay restrictions)
  const handleEnableAudio = async () => {
    if (!player) return;

    try {
      // Resume player to get user interaction permission
      await player.resume();
      await player.pause();

      console.log('✓ User interaction granted, audio enabled');
      setNeedsUserInteraction(false);
    } catch (error) {
      console.error('Failed to enable audio:', error);
    }
  };

  // Play a track (host only)
  const handlePlayTrack = (track: any) => {
    console.log('handlePlayTrack called:', { isHost, socket: !!socket, deviceId, track: track.name });

    if (!isHost) {
      console.log('Not host, cannot play');
      return;
    }

    if (!socket) {
      console.log('Socket not connected');
      alert('Not connected to server. Please refresh the page.');
      return;
    }

    if (!deviceId) {
      console.log('Device ID not set');
      alert('Spotify player not ready yet. Wait for "Connected to Spotify" message.');
      return;
    }

    // Schedule playback to start 2 seconds in the future for better sync
    const startTime = Date.now() + 2000; // 2 second countdown

    console.log('Emitting play-track event with delayed start:', {
      roomCode,
      trackUri: track.uri,
      startTime,
      delay: '2000ms'
    });

    socket.emit('play-track', {
      roomCode,
      trackId: track.id,
      trackUri: track.uri,
      position: 0,
      startTime, // All devices will start at this exact timestamp
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

  // Add to queue (host only)
  const handleAddToQueue = (track: any) => {
    if (!isHost || !socket) return;

    socket.emit('add-to-queue', { roomCode, track });
    setQueue(prev => [...prev, track]);
  };

  // Remove from queue (host only)
  const handleRemoveFromQueue = (index: number) => {
    if (!isHost || !socket) return;

    socket.emit('remove-from-queue', { roomCode, index });
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  // Skip to next track (host only)
  const handleSkipNext = () => {
    if (!isHost || !socket) return;

    socket.emit('skip-next', { roomCode });
  };

  // Skip to previous track (host only)
  const handleSkipPrevious = async () => {
    if (!isHost || !socket || !player) return;

    const state = await player.getCurrentState();
    const currentPos = state?.position || 0;

    socket.emit('skip-previous', { roomCode, currentPosition: currentPos });
  };

  // Add all tracks to queue
  const handleAddAllToQueue = (tracks: any[]) => {
    if (!isHost || !socket) return;

    tracks.forEach(track => {
      socket.emit('add-to-queue', { roomCode, track });
    });
    setQueue(prev => [...prev, ...tracks]);
  };

  if (!isAuthenticated) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className={`min-h-screen p-6 transition-all duration-1000 ${
      isPlaying
        ? 'animated-gradient'
        : 'bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600'
    }`}>
      <style jsx>{`
        @keyframes gradient-wave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animated-gradient {
          background: linear-gradient(270deg, #9333ea, #ec4899, #3b82f6, #8b5cf6);
          background-size: 400% 400%;
          animation: gradient-wave 12s ease infinite;
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Member Count */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-white font-semibold">{memberCount}</span>
            </div>

            {/* Room Code */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white font-bold text-lg tracking-wider">{roomCode}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Members List */}
            {members.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-sm">Members:</span>
                  <div className="flex -space-x-2">
                    {members.map((member, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                        title={member.displayName}
                      >
                        {member.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Leave Button */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-6 py-2 bg-pink-500/80 hover:bg-pink-500 text-white rounded-xl transition font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Leave
            </button>
          </div>
        </div>

        {/* Connection Status - Subtle indicator */}
        {!isReady && (
          <div className="mb-4 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 rounded-xl px-4 py-3 text-center">
            <p className="text-white/90 text-sm">
              Connecting to Spotify...
            </p>
          </div>
        )}

        {/* Safari/iOS Autoplay Permission Overlay */}
        {needsUserInteraction && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl max-w-md shadow-2xl">
              <div className="text-6xl mb-6">🔊</div>
              <h2 className="text-3xl font-bold text-white mb-4">Audio Permission Required</h2>
              <p className="text-white/80 mb-6">
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ?
                  'iOS requires a tap to enable audio. This is normal - just tap the button below and music will start playing!' :
                  'Your browser requires user interaction before playing audio. Tap the button below to enable playback.'
                }
              </p>
              <button
                onClick={handleEnableAudio}
                className="px-8 py-4 bg-pink-500/80 hover:bg-pink-500 text-white text-xl font-bold rounded-2xl transition-colors shadow-lg animate-pulse"
              >
                🎵 Tap to Enable Audio
              </button>
              <p className="text-white/50 text-sm mt-4">
                (You only need to do this once per session)
              </p>
            </div>
          </div>
        )}

        {/* iOS Compatibility Warning */}
        {showIOSWarning && (
          <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/40 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-white font-bold mb-1">iPhone/iPad Notice</h3>
                <p className="text-white/90 text-sm mb-2">
                  Spotify's Web Player has limited support on iOS devices. Audio may not play properly.
                </p>
                <p className="text-white/70 text-xs">
                  <strong>Best experience:</strong> Use Safari (not Chrome), or switch to Android/Desktop
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Playback Position Display */}
        {currentTrack && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="text-sm text-white/60 mb-2">Playback Position</div>
                <div className="text-4xl font-bold text-white">
                  {Math.floor(currentPosition / 1000)}.{String(currentPosition % 1000).padStart(3, '0')}s
                </div>
                <div className="text-xs text-white/50 mt-2">
                  ({currentPosition}ms)
                </div>
              </div>
              {countdown !== null && (
                <div className="flex-shrink-0 ml-6 text-center border-l border-white/20 pl-6">
                  <div className="text-sm text-white/60 mb-2">Starting in</div>
                  <div className="text-6xl font-bold text-pink-300">{countdown}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Track */}
        {currentTrack && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-white">Now Playing</h2>
            <div className="flex items-center gap-6">
              {currentTrack.album?.images?.[0] && (
                <img
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.name}
                  className="w-28 h-28 rounded-xl shadow-lg"
                />
              )}
              <div className="flex-1">
                <p className="text-2xl font-bold text-white mb-1">{currentTrack.name}</p>
                <p className="text-white/70 text-lg">
                  {currentTrack.artists?.map((a: any) => a.name).join(', ')}
                </p>
                <p className="text-sm text-white/60 mt-3 flex items-center gap-2">
                  {isPlaying ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Playing
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                      Paused
                    </>
                  )}
                </p>
              </div>
            </div>

            {isHost && (
              <div className="mt-6 flex gap-3 items-center justify-center">
                {/* Skip Previous Button */}
                <button
                  onClick={handleSkipPrevious}
                  className="px-4 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Track"
                >
                  <span className="text-2xl">⏮️</span>
                </button>

                {/* Play/Pause Toggle */}
                <button
                  onClick={isPlaying ? handlePause : handleResume}
                  className="px-8 py-4 bg-pink-500/80 hover:bg-pink-500 text-white rounded-xl transition font-semibold text-3xl"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>

                {/* Skip Next Button */}
                <button
                  onClick={handleSkipNext}
                  disabled={queue.length === 0}
                  className="px-4 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Track"
                >
                  <span className="text-2xl">⏭️</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Debug Info */}
        {isHost && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-white/80">
              <strong>Debug:</strong> Socket: {isConnected ? '✓' : '✗'} |
              Device: {deviceId ? '✓' : '✗'} |
              Player: {player ? '✓' : '✗'} |
              Ready: {isReady ? '✓' : '✗'}
            </p>
          </div>
        )}

        {/* Search (host only) */}
        {isHost && (
          <div>
            {/* Search Type Tabs */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSearchType('track')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  searchType === 'track'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Tracks
              </button>
              <button
                onClick={() => setSearchType('playlist')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  searchType === 'playlist'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Playlists
              </button>
              <button
                onClick={() => setSearchType('artist')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  searchType === 'artist'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Artists
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`Search for ${searchType}s...`}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition text-lg"
              />
            </div>

            {/* Queue Display */}
            {queue.length > 0 && (
              <div className="mb-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                <h3 className="text-white font-bold text-lg mb-3">Queue ({queue.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {queue.map((track, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-xl p-2">
                      {track.album?.images?.[2] && (
                        <img
                          src={track.album.images[2].url}
                          alt={track.name}
                          className="w-10 h-10 rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{track.name}</p>
                        <p className="text-xs text-white/60 truncate">
                          {track.artists?.map((a: any) => a.name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromQueue(idx)}
                        className="px-2 py-1 bg-red-500/50 hover:bg-red-500 text-white rounded-lg transition text-xs"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {selectedPlaylist ? (
              // Playlist tracks view
              <div>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                >
                  ← Back to search
                </button>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    {selectedPlaylist.images?.[0] && (
                      <img
                        src={selectedPlaylist.images[0].url}
                        alt={selectedPlaylist.name}
                        className="w-24 h-24 rounded-xl"
                      />
                    )}
                    <div>
                      <h3 className="text-white font-bold text-2xl">{selectedPlaylist.name}</h3>
                      <p className="text-white/70">{selectedPlaylist.tracks?.length} tracks</p>
                      <button
                        onClick={() => handleAddAllToQueue(selectedPlaylist.tracks)}
                        className="mt-2 px-4 py-2 bg-pink-500/80 hover:bg-pink-500 text-white rounded-xl transition font-semibold"
                      >
                        Add All to Queue
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedPlaylist.tracks?.map((track: any) => (
                    <div key={track.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3">
                      {track.album?.images?.[2] && (
                        <img src={track.album.images[2].url} alt={track.name} className="w-12 h-12 rounded-lg" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-white">{track.name}</p>
                        <p className="text-sm text-white/70">{track.artists?.map((a: any) => a.name).join(', ')}</p>
                      </div>
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="px-4 py-2 bg-pink-500/80 hover:bg-pink-500 text-white rounded-lg transition text-sm"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleAddToQueue(track)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm"
                      >
                        + Queue
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedArtist ? (
              // Artist tracks view
              <div>
                <button
                  onClick={() => setSelectedArtist(null)}
                  className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                >
                  ← Back to search
                </button>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    {selectedArtist.images?.[0] && (
                      <img
                        src={selectedArtist.images[0].url}
                        alt={selectedArtist.name}
                        className="w-24 h-24 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="text-white font-bold text-2xl">{selectedArtist.name}</h3>
                      <p className="text-white/70">{selectedArtist.followers?.total.toLocaleString()} followers</p>
                      <button
                        onClick={() => handleAddAllToQueue(selectedArtist.tracks)}
                        className="mt-2 px-4 py-2 bg-pink-500/80 hover:bg-pink-500 text-white rounded-xl transition font-semibold"
                      >
                        Add All to Queue
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedArtist.tracks?.map((track: any) => (
                    <div key={track.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3">
                      {track.album?.images?.[2] && (
                        <img src={track.album.images[2].url} alt={track.name} className="w-12 h-12 rounded-lg" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-white">{track.name}</p>
                        <p className="text-sm text-white/70">{track.album?.name}</p>
                      </div>
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="px-4 py-2 bg-pink-500/80 hover:bg-pink-500 text-white rounded-lg transition text-sm"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleAddToQueue(track)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm"
                      >
                        + Queue
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchType === 'track' && searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      {track.album?.images?.[2] && (
                        <img
                          src={track.album.images[2].url}
                          alt={track.name}
                          className="w-16 h-16 rounded-xl shadow-md"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">{track.name}</p>
                        <p className="text-sm text-white/70">
                          {track.artists.map((a: any) => a.name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="px-6 py-3 bg-pink-500/80 hover:bg-pink-500 text-white rounded-xl transition font-semibold"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleAddToQueue(track)}
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition font-semibold"
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                ))}
                {searchType === 'playlist' && searchResults.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handlePlaylistClick(playlist)}
                    className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      {playlist.images?.[0] && (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-16 h-16 rounded-xl shadow-md"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">{playlist.name}</p>
                        <p className="text-sm text-white/70">
                          {playlist.tracks?.total} tracks by {playlist.owner?.display_name}
                        </p>
                      </div>
                      <div className="text-white/50">→</div>
                    </div>
                  </div>
                ))}
                {searchType === 'artist' && searchResults.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => handleArtistClick(artist)}
                    className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      {artist.images?.[0] && (
                        <img
                          src={artist.images[0].url}
                          alt={artist.name}
                          className="w-16 h-16 rounded-full shadow-md"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">{artist.name}</p>
                        <p className="text-sm text-white/70">
                          {artist.followers?.total.toLocaleString()} followers
                        </p>
                      </div>
                      <div className="text-white/50">→</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State - matches model2.png */
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center min-h-[400px]">
                <svg className="w-24 h-24 text-white/40 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60 text-xl">Search for a song to start the session</p>
              </div>
            )}
          </div>
        )}

        {!isHost && !currentTrack && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-16 text-center">
            <div className="flex flex-col items-center">
              <svg className="w-20 h-20 text-white/40 mb-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-white/70 text-xl">Waiting for host to play a track...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
