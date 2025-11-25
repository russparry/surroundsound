# Data Flow Analysis - SyncSound Application
## A Beginner's Guide to Understanding Your Application

Welcome! This document will walk you through exactly what happens in your application, step by step. Think of this as a map showing how information travels through your code when users interact with your app.

---

## What Is Your Application?

**SyncSound** is a web app that lets multiple people play the same Spotify song at the exact same time on different devices, creating a "surround sound" experience. It's like having a distributed speaker system where everyone's phone or computer becomes a speaker.

**Tech Stack (What It's Built With):**
- **Frontend (What users see):** Next.js + React
- **Backend (The server):** Node.js + Socket.io
- **Real-time sync:** WebSockets (think: instant messaging for music commands)
- **Music source:** Spotify Web API + Spotify Web Playback SDK

---

## 1. What Happens When a User First Loads the App?

Let's trace the journey of a first-time visitor:

### Step 1: User Opens Your Website (http://localhost:3000)

**File:** `/app/page.tsx` (182 lines)

When someone types in your URL, here's what happens:

```
Browser request → Next.js server → Renders page.tsx
```

### Step 2: The App Checks: "Are You Logged In?"

**Function:** `useSpotify()` hook (line 26 in page.tsx)
**File:** `/contexts/SpotifyContext.tsx`

The app looks in the browser's localStorage for a saved Spotify access token:

```javascript
const { accessToken, setAccessToken } = useSpotify();
```

**Decision Point:**
- **If NO token found:** User sees a login screen with "Connect with Spotify" button
- **If token found:** User sees the dashboard with "Create Room" and "Join Room" options

### Step 3A: User Not Logged In - Login Flow Starts

**Function:** `handleLogin()` (line 54 in page.tsx)

```javascript
const handleLogin = () => {
  redirectToSpotifyAuthorize();
};
```

This function is in `/lib/spotify.ts` and does 3 things:

1. **Generates a security code** (`generateCodeVerifier()` - line 11)
   - Creates a random 128-character string
   - Saves it in localStorage as `code_verifier`
   - Think of this like a secret password that proves it's really you coming back

2. **Creates a challenge from that code** (`generateCodeChallenge()` - line 29)
   - Scrambles the code verifier using SHA-256 encryption
   - This is the PKCE security method (prevents hackers from stealing your login)

3. **Redirects to Spotify's login page** (`redirectToSpotifyAuthorize()` - line 49)
   ```
   User → Redirected to accounts.spotify.com
   URL includes: your app's ID, what permissions you need, the challenge code
   ```

### Step 4: Spotify Login & Callback

**What happens at Spotify:**
- User logs into their Spotify account
- Spotify asks: "Do you want to give SyncSound permission to control your music?"
- User clicks "Agree"

**Spotify sends user back to your app:**

**File:** `/app/auth/page.tsx` (55 lines)
**URL:** `http://localhost:3000/auth?code=ABC123XYZ...`

The `code` in the URL is like a special ticket that you'll exchange for an access token.

### Step 5: Exchange Code for Access Token

**Function:** `getAccessToken(code)` (line 67 in `/lib/spotify.ts`)

Your app takes that code and:

1. Gets the saved `code_verifier` from localStorage
2. Sends BOTH to Spotify's token endpoint:
   ```
   POST https://accounts.spotify.com/api/token
   Body: {
     code: "ABC123XYZ...",
     code_verifier: "random128chars...",
     client_id: "your-app-id",
     grant_type: "authorization_code"
   }
   ```

3. Spotify verifies everything matches and sends back:
   ```json
   {
     "access_token": "BQD123abc...",
     "expires_in": 3600,
     "token_type": "Bearer"
   }
   ```

4. **Token is saved** in localStorage as `spotify_access_token`
5. User is redirected back to home page (`/`)

### Step 6: Home Page with Access Token

Now the user sees the main dashboard:

**Components Rendered:**
- Header with "SyncSound" title
- "Create Room" card (generates a random room code)
- "Join Room" card (with input field for room code)
- Logout button

**Behind the scenes:**
- `SocketContext` connects to your WebSocket server (Socket.io)
- Connection established to `http://localhost:3000`

**File:** `/contexts/SocketContext.tsx` (line 16)
```javascript
const newSocket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});
```

**Summary of Initial Load:**
```
User opens site
  → Check for token
  → No token? Show login
  → User clicks login
  → Redirect to Spotify
  → User authorizes
  → Redirect back with code
  → Exchange code for token
  → Save token
  → Show dashboard
  → Connect WebSocket
```

---

## 2. What Happens When a User Performs the Main Action?

The main action in your app is **"Playing a song in a room so everyone hears it at the same time."**

Let's trace this from start to finish:

### Step 1: Host Creates a Room

**File:** `/app/page.tsx`
**Function:** `handleCreateRoom()` (line 57)

```javascript
const handleCreateRoom = () => {
  const roomCode = nanoid(6); // Generates random 6-character code like "3Xa9Bf"
  router.push(`/room/${roomCode}?host=true`);
};
```

**What happens:**
1. Random room code generated (e.g., "3Xa9Bf")
2. User navigates to `/room/3Xa9Bf?host=true`
3. The `?host=true` parameter tells the app this user is the host

### Step 2: Room Page Loads

**File:** `/app/room/[code]/page.tsx` (727 lines - this is the heart of your app!)

**When the page loads:**

1. **Extract room code and host status:**
   ```javascript
   const params = useParams();
   const searchParams = useSearchParams();
   const roomCode = params.code as string;
   const isHost = searchParams.get('host') === 'true';
   ```

2. **Initialize Spotify Web Playback SDK:**
   - A special JavaScript library from Spotify loads
   - Creates a virtual "device" in your browser that can play music
   - No need to have Spotify desktop app open!

   **Function:** `useEffect` hook starting at line 48
   ```javascript
   const script = document.createElement('script');
   script.src = 'https://sdk.scdn.co/spotify-player.js';
   script.async = true;
   document.body.appendChild(script);
   ```

3. **When SDK is ready (callback function):**
   **Function:** `window.onSpotifyWebPlaybackSDKReady` (line 52)

   ```javascript
   const player = new window.Spotify.Player({
     name: `SyncSound - Room ${roomCode}`,
     getOAuthToken: cb => { cb(accessToken); },
     volume: 1.0
   });
   ```

4. **Create or join the room via WebSocket:**

   **For Host:**
   ```javascript
   socket.emit('create-room', { roomCode, userId: `user-${Date.now()}` });
   ```

   **Server Side (server.js:45):**
   ```javascript
   socket.on('create-room', ({ roomCode, userId }) => {
     rooms.set(roomCode, {
       host: socket.id,
       hostUserId: userId,
       members: [{ socketId: socket.id, userId }],
       currentTrack: null,
       isPlaying: false,
       position: 0
     });
   });
   ```

   The room is now stored in the server's memory!

### Step 3: Host Searches for a Song

**User action:** Types "Drake" in the search bar and presses Enter

**Function:** `handleSearch()` (line 310)

```javascript
const handleSearch = async () => {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  const data = await response.json();
  setSearchResults(data.tracks.items);
};
```

**What happens:**
1. Your app sends a request to Spotify's API
2. Headers include the access token (proves you're authorized)
3. Spotify returns up to 10 matching tracks
4. Results are stored in React state: `searchResults`
5. UI re-renders to show the search results as clickable cards

**Data flow:**
```
User types "Drake"
  → Press Enter
  → Fetch from Spotify API
  → Spotify returns song list
  → Update React state
  → UI shows results
```

### Step 4: Host Clicks "Play" on a Song

This is where the magic happens! Let's trace this carefully.

**User action:** Clicks the "Play" button on a search result

**Function:** `handlePlayTrack(track)` (line 329)

```javascript
const handlePlayTrack = (track: any) => {
  const trackUri = track.uri; // e.g., "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
  const trackId = track.id;
  const startTime = Date.now() + 2000; // 2 seconds from now

  // Tell the server to broadcast this to everyone
  socket.emit('play-track', {
    roomCode,
    trackUri,
    trackId,
    position: 0,
    startTime
  });
};
```

**Why add 2000ms (2 seconds)?**
- Network delays! Different people's internet speeds vary
- By scheduling the start 2 seconds in the future, everyone has time to receive the command
- Then everyone presses "play" at the EXACT same time
- This is how you achieve synchronization!

### Step 5: Server Broadcasts to All Clients

**Server file:** `server.js` (line 63)

```javascript
socket.on('play-track', ({ roomCode, trackUri, trackId, position, startTime }) => {
  const room = rooms.get(roomCode);

  if (!room || room.host !== socket.id) {
    return; // Only host can control playback
  }

  room.currentTrack = { trackId, trackUri };
  room.isPlaying = true;

  // Send to EVERYONE in the room (including host)
  io.to(roomCode).emit('play-command', {
    trackUri,
    trackId,
    position,
    startTime
  });
});
```

**What happens:**
1. Server validates that the requester is the host
2. Updates the room's state in memory
3. Broadcasts `play-command` to all clients in the room

**Data flow so far:**
```
Host clicks "Play"
  → emit('play-track') via WebSocket
  → Server receives event
  → Server validates host
  → Server updates room state in memory
  → Server broadcasts to all clients in room
```

### Step 6: All Clients Receive Play Command

**File:** `/app/room/[code]/page.tsx` (line 151)

Every person in the room (host + guests) receives this event:

```javascript
socket.on('play-command', async ({ trackUri, trackId, position, startTime }) => {
  setCurrentTrack({ uri: trackUri, id: trackId });
  setIsPlaying(true);

  const now = Date.now();
  const waitTime = startTime - now;

  if (waitTime > 0) {
    // Show countdown timer
    setCountdown(Math.ceil(waitTime / 1000)); // Convert to seconds

    // Update countdown every 100ms
    const countdownInterval = setInterval(() => {
      const remaining = startTime - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 100);

    // Wait until exact start time
    setTimeout(() => {
      player.seek(position); // Start at position 0
      player.resume(); // Actually start playing
      if (isHost) {
        startSyncInterval(); // Host will broadcast position updates
      }
    }, waitTime);
  } else {
    // Start immediately (shouldn't happen with 2s buffer)
    player.seek(position);
    player.resume();
  }
});
```

**What's happening here (in simple terms):**

1. **Check the time:**
   - Current time: 1:00:00 PM
   - Start time: 1:00:02 PM (2 seconds later)
   - Wait time: 2 seconds

2. **Show countdown:**
   - UI displays: "Starting in 2... 1..."
   - This gives users visual feedback

3. **Wait exactly until start time:**
   - Uses `setTimeout(function, waitTime)` to schedule the playback
   - At EXACTLY 1:00:02 PM, everyone's player starts

4. **Play the song:**
   - `player.seek(0)` sets position to 0 seconds
   - `player.resume()` starts playback
   - Music plays through Spotify Web Playback SDK

**For the host only:**
- Starts sending position updates every 1.5 seconds
- This allows guests to correct any drift

### Step 7: Continuous Synchronization (The Secret Sauce!)

**Problem:** Even with perfect start timing, devices can drift apart due to:
- Different CPU speeds
- Network latency variations
- System load (other apps running)

**Solution:** The host continuously broadcasts their position, and guests correct drift.

**Host side - Function:** `startSyncInterval()` (line 265)

```javascript
const startSyncInterval = () => {
  const interval = setInterval(async () => {
    const state = await player.getCurrentState();
    if (!state) return;

    const position = state.position;
    socket.emit('position-update', { roomCode, position });
  }, 1500); // Every 1.5 seconds

  syncIntervalRef.current = interval;
};
```

**Server side:** `server.js` (line 93)
```javascript
socket.on('position-update', ({ roomCode, position }) => {
  const room = rooms.get(roomCode);
  if (room && room.host === socket.id) {
    room.position = position;
    // Send to all OTHER members (not host)
    socket.to(roomCode).emit('sync-position', { position });
  }
});
```

**Guest side - Receives sync-position event** (line 208 in page.tsx)

```javascript
socket.on('sync-position', async ({ position: hostPosition }) => {
  if (isHost) return; // Host doesn't sync to themselves

  const state = await player.getCurrentState();
  if (!state) return;

  const myPosition = state.position;
  const drift = Math.abs(myPosition - hostPosition);

  if (drift > 75) { // More than 75ms drift
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;

    if (timeSinceLastSync > 500) { // Don't sync too frequently
      console.log(`Drift detected: ${drift}ms, re-syncing to ${hostPosition}ms`);
      player.seek(hostPosition);
      lastSyncTimeRef.current = now;
    }
  }
});
```

**How this works:**

1. **Every 1.5 seconds:**
   - Host: "I'm at 15,342ms in the song"
   - Server: Broadcasts to all guests

2. **Guest receives update:**
   - Guest checks: "I'm at 15,420ms"
   - Calculates drift: 15,420 - 15,342 = 78ms
   - 78ms > 75ms threshold
   - **Action:** Seek to 15,342ms to re-sync

3. **Why 75ms threshold?**
   - Small differences (< 75ms) are imperceptible to human ears
   - Avoids constant seeking (which sounds glitchy)
   - Balances smoothness vs accuracy

**Complete data flow for the main action:**

```
Host: Search song
  ↓
Spotify API: Return results
  ↓
Host: Click "Play"
  ↓
WebSocket: emit('play-track') with future startTime
  ↓
Server: Validate host + broadcast('play-command')
  ↓
All Clients: Show countdown
  ↓
All Clients: Wait until exact startTime
  ↓
All Clients: player.play() simultaneously
  ↓
Host: Every 1.5s → emit('position-update')
  ↓
Server: Broadcast to guests
  ↓
Guests: Check drift + seek if > 75ms
  ↓
Result: Everyone hears the same thing at the same time!
```

---

## 3. Where Does User Authentication Happen?

Authentication happens in **two places** with **three files**:

### Place 1: Initial Login Flow

**Files involved:**
1. `/app/page.tsx` - Login button (line 54)
2. `/lib/spotify.ts` - OAuth functions (lines 11-106)
3. `/app/auth/page.tsx` - Callback handler (line 29)

**Step-by-step:**

1. **User clicks "Connect with Spotify"**
   - Function: `handleLogin()` in `/app/page.tsx:54`
   - Calls: `redirectToSpotifyAuthorize()` in `/lib/spotify.ts:49`

2. **Generate security codes (PKCE flow)**
   - Function: `generateCodeVerifier()` in `/lib/spotify.ts:11`
     - Creates random 128-char string
     - Saves to localStorage

   - Function: `generateCodeChallenge()` in `/lib/spotify.ts:29`
     - Hashes the verifier with SHA-256
     - Encodes as base64url

3. **Redirect to Spotify**
   - URL: `https://accounts.spotify.com/authorize`
   - Parameters:
     - `client_id`: Your app ID
     - `response_type`: "code"
     - `redirect_uri`: "http://127.0.0.1:3000/auth"
     - `code_challenge`: The hashed challenge
     - `code_challenge_method`: "S256"
     - `scope`: "streaming user-read-email user-modify-playback-state..."

4. **User authorizes on Spotify**
   - Spotify validates user credentials
   - User clicks "Agree" to permissions
   - Spotify redirects to: `http://127.0.0.1:3000/auth?code=ABC123...`

5. **Exchange code for token**
   - Page: `/app/auth/page.tsx`
   - Function: `getAccessToken(code)` in `/lib/spotify.ts:67`

   ```javascript
   const response = await fetch('https://accounts.spotify.com/api/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       client_id: clientId,
       grant_type: 'authorization_code',
       code: code,
       redirect_uri: redirectUri,
       code_verifier: codeVerifier // Retrieved from localStorage
     })
   });
   ```

6. **Store token and update context**
   - Token saved to localStorage: `spotify_access_token`
   - Context updated: `setAccessToken(data.access_token)` (line 43 in auth/page.tsx)
   - User redirected to home page

### Place 2: Token Usage Throughout App

**File:** `/contexts/SpotifyContext.tsx`

This React Context makes the token available everywhere:

```javascript
export const SpotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spotify_access_token');
    }
    return null;
  });

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('spotify_access_token', accessToken);
    } else {
      localStorage.removeItem('spotify_access_token');
    }
  }, [accessToken]);

  return (
    <SpotifyContext.Provider value={{ accessToken, setAccessToken }}>
      {children}
    </SpotifyContext.Provider>
  );
};
```

**How it's used:**

Any component can access the token:
```javascript
const { accessToken } = useSpotify();

// Then use in API calls:
fetch('https://api.spotify.com/v1/search?q=Drake', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

**Where the token is used:**

1. **Spotify API searches** (`/app/room/[code]/page.tsx:310`)
2. **Activating Spotify device** (line 136 in room page)
3. **Playback control API calls** (line 114 in room page)
4. **Spotify Web Playback SDK initialization** (line 58 in room page)

### Security Features:

1. **PKCE (Proof Key for Code Exchange)**
   - Prevents authorization code interception attacks
   - Code verifier is secret, only your browser knows it
   - Challenge proves you're the same browser that started the flow

2. **Token stored in localStorage**
   - Persists across page refreshes
   - Expires after 1 hour (Spotify's limit)
   - Not sent to your server (stays in browser)

3. **No password storage**
   - You never see or store user passwords
   - Spotify handles all authentication
   - Users can revoke access anytime from Spotify settings

**Authentication Summary:**
```
User clicks login
  → Generate PKCE codes
  → Redirect to Spotify
  → User authorizes
  → Spotify sends back code
  → Exchange code + verifier for token
  → Store token in localStorage
  → Token used in all API requests
```

---

## 4. Where Does Payment Processing Happen?

**Short answer: It doesn't!**

Your application has **NO payment processing** whatsoever. Here's why:

### What Your App Does NOT Have:

1. ❌ No Stripe integration
2. ❌ No PayPal integration
3. ❌ No credit card forms
4. ❌ No subscription management
5. ❌ No billing logic
6. ❌ No pricing plans
7. ❌ No user accounts/profiles
8. ❌ No payment database

### Why No Payments?

Your app is a **free tool** that relies on users already having Spotify Premium subscriptions. Here's the business model:

**Users must have:**
- ✅ Their own Spotify Premium account ($10.99/month, paid to Spotify)
- ✅ Active internet connection
- ✅ A compatible browser

**Your app provides:**
- ✅ Free synchronization service
- ✅ Room hosting and coordination
- ✅ Real-time WebSocket infrastructure

Think of your app like a **free TV remote** that works with TVs people already own. You don't charge for the remote because users already paid for the TV (Spotify Premium).

### If You Wanted to Add Payments in the Future:

You would need to add:

1. **Payment Gateway Integration**
   - Stripe (most common for web apps)
   - PayPal
   - Square

2. **Backend Changes**
   - `/api/create-payment` route
   - `/api/verify-payment` route
   - Database to store subscription status

3. **Database Schema**
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email VARCHAR(255),
     spotify_id VARCHAR(255),
     subscription_status VARCHAR(50),
     subscription_expires_at TIMESTAMP
   );

   CREATE TABLE payments (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     amount DECIMAL(10,2),
     status VARCHAR(50),
     payment_date TIMESTAMP
   );
   ```

4. **Frontend Changes**
   - Pricing page
   - Checkout page
   - Subscription management page

**But for now:** Your app is 100% free and requires no payment infrastructure!

---

## 5. What Data Is Stored in the Database and Why?

### The Truth: You Have NO Traditional Database

Your application stores data in **two places**, but neither is a traditional database:

### Storage Location 1: Server Memory (In-Memory Storage)

**File:** `server.js` (line 14)

```javascript
const rooms = new Map();
```

This is a JavaScript `Map` object that lives in RAM (temporary memory) while the server runs.

**Data structure:**
```javascript
rooms = Map {
  "3Xa9Bf" => {
    host: "socket-id-abc123",
    hostUserId: "user-1700000000",
    members: [
      { socketId: "socket-id-abc123", userId: "user-1700000000" },
      { socketId: "socket-id-def456", userId: "user-1700000001" }
    ],
    currentTrack: {
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp",
      trackUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
    },
    isPlaying: true,
    position: 45000
  },
  "9Qz2Lm" => {
    host: "socket-id-ghi789",
    members: [{ socketId: "socket-id-ghi789", userId: "user-1700000002" }],
    currentTrack: null,
    isPlaying: false,
    position: 0
  }
}
```

**What's stored:**

| Field | Type | Purpose | Why Needed |
|-------|------|---------|------------|
| `host` | string | Socket ID of room host | Verify who can control playback |
| `hostUserId` | string | User ID of host | Identify host when they reconnect |
| `members` | array | List of all connected users | Track room size, send messages |
| `currentTrack` | object | Currently playing song | Display to late joiners |
| `isPlaying` | boolean | Playback state | Resume playback for new members |
| `position` | number | Current position (ms) | Sync late joiners to correct spot |

**Why in-memory and not a database?**

1. **Speed:** RAM access is 1000x faster than database queries
2. **Simplicity:** No need to set up PostgreSQL, MongoDB, etc.
3. **Temporary data:** Rooms only exist during the session
4. **No persistence needed:** When a room ends, the data should be deleted

**Limitations:**

- ❌ If server restarts, all rooms are lost
- ❌ Can't scale across multiple servers
- ❌ No room history or analytics
- ❌ No way to rejoin a room after server restart

**When is data created/deleted?**

Created:
- When host emits `create-room` event (`server.js:45`)

Updated:
- When guest emits `join-room` event (`server.js:56`)
- When host emits `play-track` event (`server.js:63`)
- When host emits `position-update` event (`server.js:93`)

Deleted:
- When host disconnects (`server.js:122`)
- When all members leave (`server.js:133`)

### Storage Location 2: Browser localStorage (Client-Side)

**What's stored:**

| Key | Value | Purpose | When Stored | When Deleted |
|-----|-------|---------|-------------|--------------|
| `spotify_access_token` | string (JWT) | Authenticate API requests | After OAuth callback | On logout or expiry |
| `code_verifier` | string (128 chars) | PKCE security code | Before OAuth redirect | After token exchange |

**Files that access localStorage:**

1. **Storing token:**
   - `/app/auth/page.tsx:43` - After successful OAuth
   - `/contexts/SpotifyContext.tsx:13` - When token changes

2. **Reading token:**
   - `/contexts/SpotifyContext.tsx:8` - On app load
   - `/app/page.tsx:26` - Check if logged in

3. **Deleting token:**
   - `/app/page.tsx:69` - On logout
   ```javascript
   const logout = () => {
     localStorage.removeItem('spotify_access_token');
     setAccessToken(null);
   };
   ```

**Why localStorage?**
- ✅ Persists across page refreshes
- ✅ Available without network request
- ✅ Secure enough for short-lived tokens (1 hour expiry)
- ✅ Automatically scoped to your domain

**Why NOT a database for tokens?**
- Tokens are user-specific and temporary
- No need to share across devices
- Expires after 1 hour anyway

### What About Spotify's Data?

You don't store any of Spotify's data in your app. Everything comes from Spotify's API in real-time:

**Song data (search results):**
- Requested: `/app/room/[code]/page.tsx:310`
- Stored: React state only (lost on page refresh)
- Not persisted anywhere

**User profile data:**
- Never fetched or stored
- Could fetch from `https://api.spotify.com/v1/me` if needed

**Playback state:**
- Managed by Spotify Web Playback SDK
- Stored in browser's Spotify SDK instance
- Not in your database or localStorage

### If You Wanted a Real Database:

You would add:

**Option 1: PostgreSQL (Relational)**
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE room_members (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  user_id VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP
);

CREATE TABLE room_tracks (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  track_id VARCHAR(255) NOT NULL,
  track_uri VARCHAR(255) NOT NULL,
  played_at TIMESTAMP DEFAULT NOW()
);
```

**Option 2: MongoDB (Document)**
```javascript
{
  roomCode: "3Xa9Bf",
  host: "user-123",
  members: [
    { userId: "user-123", joinedAt: "2024-01-01T10:00:00Z" },
    { userId: "user-456", joinedAt: "2024-01-01T10:02:00Z" }
  ],
  tracks: [
    { trackId: "abc", playedAt: "2024-01-01T10:05:00Z" }
  ],
  createdAt: "2024-01-01T10:00:00Z",
  endedAt: null
}
```

**Why you might add a database:**
- Track usage analytics (how many rooms per day?)
- Room history (what songs were played?)
- User profiles (favorite songs, listening stats)
- Persistent rooms (rooms that survive server restarts)
- Monetization (premium features, subscription tracking)

**Why you DON'T need one now:**
- ✅ Your app works perfectly without it
- ✅ Keeps costs at $0 (no database hosting fees)
- ✅ Simpler architecture = easier to maintain
- ✅ Focus on core feature (synchronization) first

### Data Flow Summary:

```
User creates room
  → Server stores in RAM (rooms Map)
  → Room exists in memory only

User plays track
  → Server updates room.currentTrack in RAM
  → Position sent every 1.5s, stored in RAM

User disconnects
  → Server removes from rooms.members
  → If host left: entire room deleted from RAM

Server restarts
  → All rooms lost forever
  → Users must create new rooms
```

---

## 6. Complete Data Flow Diagram

Here's a visual representation of all data flows in your app:

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Frontend: Next.js + React                                 │ │
│  │                                                            │ │
│  │  Pages:                                                    │ │
│  │  • /app/page.tsx (Home/Dashboard)                          │ │
│  │  • /app/auth/page.tsx (OAuth Callback)                     │ │
│  │  • /app/room/[code]/page.tsx (Listening Room)              │ │
│  │                                                            │ │
│  │  Contexts:                                                 │ │
│  │  • SpotifyContext (Token Management)                       │ │
│  │  • SocketContext (WebSocket Connection)                    │ │
│  │                                                            │ │
│  │  Storage:                                                  │ │
│  │  • localStorage: spotify_access_token, code_verifier       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Spotify Web Playback SDK                                  │ │
│  │  (Embedded music player in browser)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        │                  │                  │
    HTTP/HTTPS         WebSocket         HTTP/HTTPS
    Requests          Connection         Requests
        │                  │                  │
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Your Server    │  │   Your Server    │  │  Spotify APIs    │
│   (Node.js)      │  │   (Socket.io)    │  │                  │
│                  │  │                  │  │                  │
│  • Serves pages  │  │  • Room mgmt     │  │  • OAuth         │
│  • Static files  │  │  • Real-time     │  │  • Search        │
│                  │  │    sync          │  │  • Playback      │
│                  │  │                  │  │                  │
│  server.js       │  │  server.js       │  │  *.spotify.com   │
│  (HTTP part)     │  │  (Socket part)   │  │                  │
│                  │  │                  │  │                  │
│                  │  │  Storage:        │  │                  │
│                  │  │  • In-memory     │  │                  │
│                  │  │    rooms Map     │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Event Flow for Playing a Song:

```
┌─────────┐  1. Click Play   ┌─────────┐  2. Fetch Search  ┌─────────┐
│  Host   │ ──────────────→ │ Browser │ ─────────────────→│ Spotify │
│ Device  │                  │ React   │                    │   API   │
└─────────┘                  │ State   │                    └─────────┘
                             └─────────┘                         │
                                  │                              │
                                  │ 3. Play Track                │
                                  │    Emit Event                │
                                  │                              │
                                  ▼                              │
                             ┌─────────┐                         │
                             │ Socket  │                         │
                             │  .io    │                         │
                             │ Client  │                         │
                             └─────────┘                         │
                                  │                              │
                                  │ WebSocket                    │
                                  │                              │
                                  ▼                              │
                             ┌─────────┐                         │
                             │ Socket  │                         │
                             │  .io    │ 4. Update room state    │
                             │ Server  │    in memory            │
                             └─────────┘                         │
                                  │                              │
                                  │ 5. Broadcast                 │
                                  │    play-command              │
                    ┌─────────────┼─────────────┐                │
                    │             │             │                │
                    ▼             ▼             ▼                │
               ┌─────────┐  ┌─────────┐  ┌─────────┐            │
               │  Host   │  │ Guest 1 │  │ Guest 2 │            │
               │  SDK    │  │  SDK    │  │  SDK    │            │
               └─────────┘  └─────────┘  └─────────┘            │
                    │             │             │                │
                    │             │             │                │
                    └─────────────┴─────────────┴────────────────┘
                                  │
                                  │ 6. All devices play at same time
                                  │    (Spotify streams audio)
                                  ▼
                             ┌─────────┐
                             │ Spotify │
                             │ Servers │
                             │ (Audio) │
                             └─────────┘
```

---

## 7. Key Takeaways for a Beginner

### What makes your app special:

1. **Real-time synchronization**
   - Uses WebSockets (Socket.io) for instant communication
   - Schedules playback with future timestamps
   - Corrects drift automatically every 1.5 seconds

2. **No backend database needed**
   - All room data in RAM (fast but temporary)
   - Perfect for a demo or proof-of-concept
   - Easy to deploy anywhere

3. **Leverages Spotify's infrastructure**
   - You don't stream audio (Spotify does)
   - You don't store songs (Spotify does)
   - You just coordinate "when to press play"

4. **Client-heavy architecture**
   - Most logic in browser (React)
   - Server is just a message router
   - Spotify SDK does the heavy lifting

### If you were to explain this to someone:

> "My app is like a conductor for an orchestra, but the orchestra is people's Spotify apps. I don't make any music myself - I just tell everyone 'start playing THIS song at EXACTLY 3:45 PM.' Then I keep checking if anyone's off-beat and tell them to catch up. The cool part is everyone's device becomes a speaker in a giant surround-sound system, all perfectly in sync, without any special hardware."

### Technical skills you're demonstrating:

- ✅ OAuth 2.0 with PKCE (industry-standard authentication)
- ✅ WebSocket real-time communication (scalable architecture)
- ✅ React state management with Context API
- ✅ Timestamp-based synchronization (precise timing logic)
- ✅ Drift correction algorithms (audio engineering concept)
- ✅ API integration (Spotify Web API + SDK)
- ✅ Next.js full-stack framework (modern web development)

---

## Files Reference Quick Guide

Here's every file in your project and its purpose:

| File | Lines | Purpose |
|------|-------|---------|
| `/server.js` | 189 | Node.js server: HTTP + WebSocket |
| `/app/page.tsx` | 182 | Home page: Login + room creation/joining |
| `/app/room/[code]/page.tsx` | 727 | Listening room: Main app logic |
| `/app/auth/page.tsx` | 55 | OAuth callback: Token exchange |
| `/lib/spotify.ts` | 107 | Spotify utilities: OAuth functions |
| `/contexts/SpotifyContext.tsx` | 57 | Token state management |
| `/contexts/SocketContext.tsx` | 53 | WebSocket connection management |
| `/components/Providers.tsx` | 16 | Combines both contexts |
| `/app/layout.tsx` | 25 | Root layout: Wraps entire app |
| `/package.json` | 33 | Dependencies and scripts |
| `/.env.local` | 18 | Environment variables (Spotify credentials) |

---

## Conclusion

Your SyncSound application is a well-architected real-time web app that:

- ✅ Authenticates users securely via Spotify OAuth
- ✅ Creates temporary listening rooms in server memory
- ✅ Synchronizes music playback across multiple devices
- ✅ Corrects timing drift automatically
- ✅ Requires no database or payment processing
- ✅ Leverages Spotify's existing infrastructure

The data flows are clean and efficient, making this a great portfolio project that demonstrates modern web development skills!

---

**Congratulations! You now understand every data flow in your application.** 🎵✨
