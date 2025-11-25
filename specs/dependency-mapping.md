# Dependency Mapping - Complete System Dependencies
## Understanding What Your Application Relies On

This document maps every external service, library, API endpoint, and integration your application depends on, explaining why each is critical and what breaks when they fail.

---

## 1. External Services (Third-Party Platforms)

These are services you don't control but depend on to function.

### Service #1: Spotify Platform

**Provider:** Spotify AB
**Type:** Music Streaming & API Platform
**Cost:** Free (for API usage within limits)
**Documentation:** https://developer.spotify.com

#### **What You Use From Spotify:**

| Component | Purpose | Where Used |
|-----------|---------|------------|
| **Spotify OAuth 2.0** | User authentication | `/lib/spotify.ts` |
| **Spotify Web API** | Search songs, control playback | `/app/room/[code]/page.tsx` |
| **Spotify Web Playback SDK** | Play audio in browser | `/app/room/[code]/page.tsx` |

#### **Why You Need It:**

1. **User Authentication**
   - You don't store passwords
   - Spotify verifies user identity
   - Provides access tokens for API calls

2. **Music Catalog Access**
   - Millions of songs searchable
   - Album artwork and metadata
   - No need to host music files

3. **Audio Streaming**
   - Spotify streams audio directly to users
   - No bandwidth costs for you
   - High-quality playback

4. **Playback Control**
   - SDK allows you to control playback programmatically
   - Seek, pause, resume, volume control
   - Works without Spotify desktop app

#### **What Breaks If Spotify Fails:**

| Scenario | Impact | User Experience |
|----------|--------|-----------------|
| **OAuth server down** | 🔴 CRITICAL | Cannot log in, app unusable |
| **Web API down** | 🔴 CRITICAL | Cannot search songs, cannot play |
| **Playback SDK down** | 🔴 CRITICAL | Audio won't play |
| **Rate limit exceeded** | 🟡 MODERATE | Search/playback temporarily unavailable |
| **Token expires (1 hour)** | 🟡 MODERATE | User must re-login (no auto-refresh) |
| **User's Premium lapses** | 🟡 MODERATE | That user cannot use your app |
| **API changes/deprecation** | 🟠 HIGH | App breaks until code updated |

#### **Mitigation Strategies:**

```javascript
// Currently missing - should add:
1. Token refresh before expiry
2. Retry logic for API failures
3. Fallback error messages for users
4. Cache search results temporarily
5. Monitor Spotify API status page
```

#### **Rate Limits & Quotas:**

- **OAuth requests:** Unlimited (but subject to rate limiting)
- **Web API calls:** 180 requests per minute per access token
- **Web Playback SDK:** No explicit limit
- **Free tier:** Adequate for thousands of users

**Your current usage pattern:**
- Search: ~1 request per search (manageable)
- Playback: ~1 request per track start (manageable)
- Position updates: Client-side only (no API calls)

---

### Service #2: Vercel (Deployment Platform)

**Provider:** Vercel Inc.
**Type:** Hosting & CDN
**Cost:** Free tier (Hobby plan) suitable for demo
**Documentation:** https://vercel.com/docs

#### **What You Use From Vercel:**

| Feature | Purpose | Why Needed |
|---------|---------|------------|
| **Edge Network** | Fast global content delivery | Serve frontend assets quickly |
| **Serverless Functions** | (Not currently used) | Could host API routes |
| **Custom Server Support** | Run your Node.js server | Host WebSocket server (server.js) |
| **Environment Variables** | Store Spotify credentials securely | Keep secrets out of code |

#### **Current Configuration:**

Your app uses a **custom Node.js server** (`server.js`), which means:
- ✅ Full control over HTTP and WebSocket servers
- ✅ Can use Socket.io for real-time communication
- ⚠️ Requires Vercel Pro plan for WebSocket support in production

**Note:** Vercel's free tier doesn't support WebSockets in production. For deployment, you'd need:
- **Option 1:** Upgrade to Vercel Pro ($20/month)
- **Option 2:** Use Railway, Render, or DigitalOcean for backend
- **Option 3:** Split architecture (Vercel for frontend, separate host for WebSocket server)

#### **What Breaks If Vercel Fails:**

| Scenario | Impact | User Experience |
|----------|--------|-----------------|
| **Vercel platform outage** | 🔴 CRITICAL | Entire site unavailable |
| **Deploy fails** | 🟡 MODERATE | New features don't ship, old version remains |
| **CDN cache issues** | 🟢 MINOR | Slower load times |

---

### Service #3: Your Local Network (Current Setup)

**Provider:** Your computer/router
**Type:** Development environment
**Cost:** Free

#### **What You're Currently Using:**

```
Local Development:
- Server: http://127.0.0.1:3000 (localhost)
- Network access: http://10.34.137.205:3000 (LAN devices)
```

**Why this matters:**
- ✅ Other devices on your WiFi can join rooms
- ✅ Test on multiple devices (phone, tablet, laptop)
- ⚠️ Not accessible from outside your network

#### **What Breaks If Local Network Fails:**

| Scenario | Impact |
|----------|--------|
| **WiFi goes down** | 🔴 All connected devices lose sync |
| **Computer restarts** | 🔴 All rooms destroyed (in-memory storage) |
| **IP address changes** | 🟡 Need to update .env.local |

---

### Services You DON'T Use (But Prompt Mentioned):

- ❌ **Supabase:** No database or backend-as-a-service
- ❌ **Stripe:** No payment processing
- ❌ **Auth0/Firebase:** Using Spotify OAuth instead
- ❌ **AWS/GCP:** Using Vercel for hosting
- ❌ **MongoDB/PostgreSQL:** In-memory storage only

---

## 2. Major Libraries & Packages

Every npm package your app depends on, from `package.json`:

### **2.1 Core Framework Libraries**

---

#### **next (v16.0.1)**

**What it is:** React-based web framework
**Why you need it:** Powers your entire frontend

**Key Features You Use:**
- App Router (file-based routing)
- React Server Components
- Built-in development server
- Code splitting and optimization

**Where it's used:**
- `/app/**/*.tsx` - All pages use Next.js conventions
- `package.json:8` - Build process
- `server.js:15` - Next.js request handler integration

**What breaks if it fails:**
- 🔴 **CRITICAL:** Entire app won't run
- No pages render
- No routing works
- Build process fails

**Can you replace it?**
- 🔶 Hard but possible
- Could use plain React + React Router
- Would lose: SSR, automatic code splitting, App Router conventions
- **Not recommended**

---

#### **react (v19.2.0) + react-dom (v19.2.0)**

**What it is:** JavaScript library for building user interfaces
**Why you need it:** Powers all your UI components

**Where it's used:**
- Every `.tsx` file in `/app`
- Every component uses JSX syntax
- State management (`useState`, `useEffect`, `useContext`)

**What breaks if it fails:**
- 🔴 **CRITICAL:** UI won't render
- No interactivity
- No state updates
- App completely non-functional

**Can you replace it?**
- ❌ No
- Next.js requires React
- Entire codebase written with React

---

### **2.2 Real-Time Communication**

---

#### **socket.io (v4.8.1) - Server**

**What it is:** Real-time, bidirectional event-based communication library
**Why you need it:** Core synchronization mechanism

**Where it's used:**
- `server.js:8` - WebSocket server initialization
- `server.js:43-143` - All room coordination logic

**What it does:**
```javascript
// Creates WebSocket server
const io = socketIO(server, {
  cors: { origin: '*' }
});

// Handles events
io.on('connection', (socket) => {
  socket.on('create-room', handler);
  socket.on('play-track', handler);
  // etc.
});
```

**What breaks if it fails:**
- 🔴 **CRITICAL:** No real-time sync
- Rooms can't be created
- Host can't control guest playback
- No multi-user functionality
- App becomes single-player only

**Can you replace it?**
- 🟡 Possible but difficult
- Alternatives: Native WebSockets, Server-Sent Events (SSE)
- Would need to rewrite all event handling
- Socket.io provides: Reconnection, rooms, broadcasting
- **Not worth replacing**

---

#### **socket.io-client (v4.8.1) - Client**

**What it is:** Client-side Socket.io library
**Why you need it:** Connects browser to WebSocket server

**Where it's used:**
- `/contexts/SocketContext.tsx:16` - Connection setup
- `/app/room/[code]/page.tsx` - All event listeners

**What it does:**
```javascript
// Connect to server
const socket = io('http://localhost:3000');

// Listen for events
socket.on('play-command', (data) => {
  // Handle playback
});

// Emit events
socket.emit('play-track', { roomCode, trackUri });
```

**What breaks if it fails:**
- 🔴 **CRITICAL:** Cannot connect to server
- No real-time updates
- Entire multi-user feature broken

**Must match:** Server-side socket.io version (both 4.8.1) ✅

---

### **2.3 Spotify Integration**

---

#### **@spotify/web-api-ts-sdk (v1.2.0)**

**What it is:** Official TypeScript SDK for Spotify Web API
**Why you need it:** (Currently NOT USED in your code!)

**Current status:** ❌ Installed but unused

**What you're using instead:**
- Native `fetch()` calls to Spotify API
- Custom OAuth implementation in `/lib/spotify.ts`

**Should you use it?**
- 🟡 Optional
- **Pros:** Type safety, better error handling, built-in methods
- **Cons:** Additional bundle size, learning curve

**Example of what you COULD use it for:**
```typescript
// Current approach (manual fetch):
fetch('https://api.spotify.com/v1/search?q=Drake', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// With SDK:
const spotify = SpotifyApi.withAccessToken(clientId, token);
const results = await spotify.search('Drake', ['track']);
```

**Recommendation:** Can remove from `package.json` if not planning to use

---

### **2.4 Styling & UI**

---

#### **tailwindcss (v4.1.16)**

**What it is:** Utility-first CSS framework
**Why you need it:** All your styling

**Where it's used:**
- `/app/globals.css:3` - Tailwind imports
- Every component: `className="flex items-center justify-center"` etc.

**Example:**
```tsx
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Create Room
</button>
```

**What breaks if it fails:**
- 🟡 **MODERATE:** App looks broken (no styles)
- Functionality still works
- Layout completely wrong
- Text tiny/hard to read

**Can you replace it?**
- 🟡 Possible but time-consuming
- Would need to rewrite all `className` attributes
- Alternatives: CSS Modules, Styled Components, plain CSS

---

#### **@tailwindcss/postcss (v4.1.17)**

**What it is:** PostCSS plugin for Tailwind CSS 4.x
**Why you need it:** Processes Tailwind styles

**Where it's used:**
- Build process (Next.js integrates automatically)
- Compiles Tailwind classes to actual CSS

**What breaks if it fails:**
- 🔴 **CRITICAL:** Build fails
- Tailwind classes won't compile
- No styles in production

---

#### **postcss (v8.5.6)**

**What it is:** Tool for transforming CSS with JavaScript
**Why you need it:** Required by Tailwind

**What breaks if it fails:**
- 🔴 **CRITICAL:** Build process breaks
- CSS processing fails

---

#### **autoprefixer (v10.4.21)**

**What it is:** PostCSS plugin to add vendor prefixes
**Why you need it:** Cross-browser CSS compatibility

**What it does:**
```css
/* You write: */
display: flex;

/* It outputs: */
display: -webkit-box;
display: -ms-flexbox;
display: flex;
```

**What breaks if it fails:**
- 🟢 **MINOR:** Styles might not work in older browsers
- Modern browsers (2020+) mostly don't need prefixes
- Mostly affects Safari, older Edge

---

### **2.5 Utilities**

---

#### **nanoid (v5.1.6)**

**What it is:** Tiny, secure URL-friendly ID generator
**Why you need it:** Creates random room codes

**Where it's used:**
- `/app/page.tsx:57` - `const roomCode = nanoid(6);`

**What it does:**
```javascript
nanoid(6) // => "3Xa9Bf"
nanoid(6) // => "9Qz2Lm"
```

**What breaks if it fails:**
- 🔴 **MODERATE:** Can't create rooms
- "Create Room" button won't work

**Can you replace it?**
- ✅ Easy
```javascript
// Alternative (built-in):
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

**Why use nanoid?**
- Cryptographically secure (better randomness)
- No collisions in millions of IDs
- URL-safe characters only

---

### **2.6 TypeScript & Type Definitions**

---

#### **typescript (v5.9.3)**

**What it is:** JavaScript with syntax for types
**Why you need it:** Type safety, better developer experience

**Where it's used:**
- All `.ts` and `.tsx` files
- Type checking during development
- Compiles to JavaScript for production

**What breaks if it fails:**
- 🟡 **MODERATE:** Build fails
- Development experience worse
- Can't catch type errors early

**Can you replace it?**
- 🟡 Possible (convert all files to `.js`)
- Would lose type safety
- **Not recommended** for any serious project

---

#### **@types/node (v24.10.0)**

**What it is:** TypeScript type definitions for Node.js
**Why you need it:** Type checking for Node.js APIs

**Where it's used:**
- `server.js` (if it were `.ts`)
- Type checking for `require()`, `process`, `Buffer`, etc.

---

#### **@types/react (v19.2.2)**

**What it is:** TypeScript definitions for React
**Why you need it:** Type checking for React components

**Where it's used:**
- Every `.tsx` file
- Enables type checking for props, state, hooks

---

#### **@types/react-dom (v19.2.2)**

**What it is:** TypeScript definitions for ReactDOM
**Why you need it:** Type checking for DOM rendering

---

## 3. API Endpoints in Your Backend

Your backend has **NO traditional REST API endpoints**. Instead, it uses **WebSocket events**.

### WebSocket Event-Based API:

#### **Server-to-Client Events (Server → Browser)**

| Event Name | Payload | Purpose | Trigger | File |
|------------|---------|---------|---------|------|
| `room-created` | `{ roomCode }` | Confirm room creation | After `create-room` | `server.js:51` |
| `room-joined` | `{ members, currentTrack, isPlaying, position }` | Confirm room join | After `join-room` | `server.js:61` |
| `member-joined` | `{ userId, memberCount }` | New member joined | Guest joins room | `server.js:61` |
| `member-left` | `{ userId, memberCount }` | Member left | User disconnects | `server.js:133` |
| `host-left` | `{ reason }` | Host disconnected | Host leaves | `server.js:127` |
| `play-command` | `{ trackUri, trackId, position, startTime }` | Start playback | Host plays track | `server.js:70` |
| `pause-command` | `{}` | Pause playback | Host pauses | `server.js:77` |
| `resume-command` | `{ position }` | Resume playback | Host resumes | `server.js:84` |
| `seek-command` | `{ position }` | Seek to position | Host seeks | Not implemented |
| `sync-position` | `{ position }` | Host position update | Every 1.5s | `server.js:96` |
| `error` | `{ message }` | Error message | Validation fails | `server.js:66, 74, 81, 89` |

#### **Client-to-Server Events (Browser → Server)**

| Event Name | Payload | Purpose | File |
|------------|---------|---------|------|
| `create-room` | `{ roomCode, userId }` | Create new room | `/app/room/[code]/page.tsx:106` |
| `join-room` | `{ roomCode, userId }` | Join existing room | `/app/room/[code]/page.tsx:113` |
| `play-track` | `{ roomCode, trackUri, trackId, position, startTime }` | Play track (host only) | `/app/room/[code]/page.tsx:329` |
| `pause` | `{ roomCode }` | Pause (host only) | `/app/room/[code]/page.tsx:354` |
| `resume` | `{ roomCode, position }` | Resume (host only) | `/app/room/[code]/page.tsx:364` |
| `position-update` | `{ roomCode, position }` | Host broadcasts position | `/app/room/[code]/page.tsx:269` |

#### **What Breaks If WebSocket Events Fail:**

| Scenario | Impact |
|----------|--------|
| **Event not emitted** | 🔴 Action doesn't trigger (e.g., room not created) |
| **Event not received** | 🔴 Client doesn't respond (e.g., song doesn't play) |
| **Malformed payload** | 🟡 Server/client throws error, may crash |
| **Wrong room code** | 🟡 Message sent to wrong room or nowhere |

---

### External API Endpoints (Spotify)

#### **3.1 Spotify OAuth Endpoints**

| Endpoint | Method | Purpose | File | Response |
|----------|--------|---------|------|----------|
| `https://accounts.spotify.com/authorize` | GET | Start OAuth flow | `/lib/spotify.ts:49` | Redirect to Spotify login |
| `https://accounts.spotify.com/api/token` | POST | Exchange code for token | `/lib/spotify.ts:67` | `{ access_token, expires_in }` |

**What breaks if OAuth fails:**
- 🔴 **CRITICAL:** Users cannot log in
- App completely unusable

---

#### **3.2 Spotify Web API Endpoints**

| Endpoint | Method | Purpose | File | Response |
|----------|--------|---------|------|----------|
| `https://api.spotify.com/v1/search` | GET | Search tracks | `/app/room/[code]/page.tsx:310` | `{ tracks: { items: [...] } }` |
| `https://api.spotify.com/v1/me/player` | PUT | Activate device | `/app/room/[code]/page.tsx:136` | `{}` |
| `https://api.spotify.com/v1/me/player/play` | PUT | Start playback | (SDK handles internally) | `{}` |

**What breaks if Web API fails:**
- 🔴 **CRITICAL:** Cannot search songs
- Cannot control playback
- App core feature broken

---

#### **3.3 Spotify Web Playback SDK (Embedded JavaScript)**

| Component | Purpose | File |
|-----------|---------|------|
| `https://sdk.scdn.co/spotify-player.js` | Playback SDK script | `/app/room/[code]/page.tsx:48` |
| `window.Spotify.Player` | Player constructor | `/app/room/[code]/page.tsx:58` |

**What breaks if SDK fails:**
- 🔴 **CRITICAL:** Cannot play audio
- All playback features broken

---

## 4. Database Tables and Relationships

**Short answer: You have NO database.**

### What You Use Instead:

#### **4.1 In-Memory Storage (Server)**

**Data Structure:** JavaScript `Map` object
**File:** `server.js:14`
**Persistence:** None (lost on restart)

```javascript
const rooms = new Map();

// Structure:
Map {
  "3Xa9Bf" => {
    host: "socket-id-abc123",
    hostUserId: "user-1700000000",
    members: [
      { socketId: "socket-abc123", userId: "user-1700000000" },
      { socketId: "socket-def456", userId: "user-1700000001" }
    ],
    currentTrack: {
      trackId: "spotify-track-id",
      trackUri: "spotify:track:id"
    },
    isPlaying: true,
    position: 45000
  }
}
```

**What breaks if in-memory storage fails:**
- 🔴 **CRITICAL:** All rooms lost
- Cannot track room members
- Cannot coordinate playback

**Mitigation for production:**
```javascript
// Recommended: Redis (in-memory database)
const redis = require('redis');
const client = redis.createClient();

// Store room
await client.set(`room:${roomCode}`, JSON.stringify(roomData));

// Retrieve room
const roomData = JSON.parse(await client.get(`room:${roomCode}`));
```

---

#### **4.2 Browser Storage (Client)**

**Type:** localStorage (Web Storage API)
**File:** `/contexts/SpotifyContext.tsx:13`
**Capacity:** ~5MB per domain
**Persistence:** Until manually cleared

**What's Stored:**

| Key | Value | Purpose | Size |
|-----|-------|---------|------|
| `spotify_access_token` | JWT string (~500 chars) | Authenticate API requests | ~0.5KB |
| `code_verifier` | Random string (128 chars) | PKCE OAuth flow | ~0.13KB |

**What breaks if localStorage fails:**
- 🔴 **MODERATE:** User logged out on page refresh
- Must re-authenticate every time
- Poor user experience

---

### If You Added a Real Database:

**What you'd need for production:**

#### **Option 1: PostgreSQL (Relational)**

```sql
-- Persistent rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Room members
CREATE TABLE room_members (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP
);

-- Playback history
CREATE TABLE tracks_played (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW()
);

-- User analytics (optional)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits:**
- ✅ Survive server restarts
- ✅ Room history and analytics
- ✅ User profiles and preferences
- ✅ Scale across multiple servers

**Cost:** $5-10/month (Supabase, Railway, etc.)

---

#### **Option 2: Redis (In-Memory Database)**

```javascript
// Fast, in-memory, but can persist to disk
await redis.hset(`room:${roomCode}`, {
  host: hostSocketId,
  members: JSON.stringify(membersArray),
  currentTrack: JSON.stringify(trackData),
  isPlaying: true,
  position: 45000
});
```

**Benefits:**
- ✅ Very fast (sub-millisecond access)
- ✅ Can persist to disk
- ✅ Built-in expiration (TTL)
- ✅ Pub/sub for real-time features

**Cost:** Free tier (Upstash, Redis Cloud) adequate

---

## 5. Third-Party Integrations

### Integration #1: Spotify Platform (Detailed Above)

**Summary:**
- OAuth 2.0 for authentication
- Web API for search and control
- Web Playback SDK for audio

---

### Integration #2: Vercel (Deployment)

**Summary:**
- Hosts your application
- Provides CDN for fast asset delivery
- ⚠️ Free tier doesn't support WebSockets in production

---

### Integrations You DON'T Have:

- ❌ **Payment Processing:** No Stripe, PayPal, etc.
- ❌ **Email Service:** No SendGrid, Mailgun, etc.
- ❌ **Analytics:** No Google Analytics, Mixpanel, etc.
- ❌ **Error Tracking:** No Sentry, LogRocket, etc.
- ❌ **CDN:** No Cloudflare (using Vercel's built-in CDN)
- ❌ **Database:** No Supabase, PlanetScale, MongoDB Atlas, etc.
- ❌ **Authentication Service:** No Auth0, Clerk, Firebase Auth
- ❌ **Monitoring:** No Datadog, New Relic, etc.

---

## 6. Dependency Failure Impact Matrix

### Critical Dependencies (App Completely Broken)

| Dependency | Failure Scenario | Impact | Mitigation |
|------------|------------------|--------|------------|
| **Spotify OAuth** | Service down | Cannot login | None (wait for Spotify) |
| **Spotify Web API** | Service down | Cannot search/play | Cache recent searches |
| **Spotify SDK** | Script fails to load | No audio playback | Fallback error message |
| **Socket.io Server** | Crashes | No real-time sync | Auto-restart server |
| **Socket.io Client** | Connection drops | Lost sync | Auto-reconnect logic |
| **Next.js** | Build fails | App won't start | Fix build errors |
| **React** | Runtime error | UI crashes | Error boundaries |

### Moderate Dependencies (Degraded Experience)

| Dependency | Failure Scenario | Impact | Mitigation |
|------------|------------------|--------|------------|
| **Tailwind CSS** | Build fails | No styles | Use inline styles temporarily |
| **localStorage** | User disables | Logged out on refresh | Show warning to user |
| **nanoid** | Import fails | Can't create rooms | Use Math.random() fallback |
| **Network** | WiFi drops | Disconnected | Reconnect when back online |

### Minor Dependencies (Barely Noticeable)

| Dependency | Failure Scenario | Impact | Mitigation |
|------------|------------------|--------|------------|
| **autoprefixer** | Fails | Styles in old browsers | Most users on modern browsers |
| **TypeScript** | Type errors | Dev experience worse | Fix type errors |
| **@types/** | Missing | No type checking | Can still run JS |

---

## 7. Dependency Update Strategy

### How Often to Update:

| Package Type | Update Frequency | Why |
|--------------|------------------|-----|
| **Security patches** | Immediately | Critical vulnerabilities |
| **Next.js** | Every minor version | New features, performance |
| **React** | Every minor version | Stability improvements |
| **Socket.io** | Only when needed | Breaking changes possible |
| **Tailwind** | Every 6 months | New utility classes |
| **TypeScript** | Every 6 months | New language features |

### Commands to Update:

```bash
# Check for outdated packages
npm outdated

# Update all non-breaking changes
npm update

# Update to latest (including breaking changes)
npm install next@latest react@latest react-dom@latest

# Audit for security vulnerabilities
npm audit
npm audit fix
```

---

## 8. Removing Unused Dependencies

### Currently Unused:

**@spotify/web-api-ts-sdk (v1.2.0)**
- ❌ Not imported anywhere
- ❌ Not used in any file
- ✅ Safe to remove

```bash
npm uninstall @spotify/web-api-ts-sdk
```

**Savings:**
- Bundle size: -150KB
- Install time: -2 seconds

---

## 9. Cost Analysis

### Current Monthly Costs:

| Service | Tier | Cost | What You Get |
|---------|------|------|--------------|
| **Spotify API** | Free | $0 | Unlimited OAuth, API within limits |
| **Vercel** | Hobby | $0 | 100GB bandwidth, custom domains |
| **Domain** | (if purchased) | $10-15/year | Custom domain name |
| **npm packages** | Free | $0 | All open-source |
| **Development** | Local | $0 | Your computer |
| **TOTAL** | | **$0/month** | Perfect for MVP! |

### Production Costs (Estimated at 1,000 Active Users):

| Service | Tier | Monthly Cost | Why |
|---------|------|--------------|-----|
| **Vercel Pro** | Pro plan | $20 | WebSocket support |
| **Redis** | Upstash free | $0 | 10K commands/day free |
| **Monitoring** | Sentry free | $0 | Error tracking |
| **Domain** | Namecheap | $1.25 | .com domain |
| **TOTAL** | | **~$21/month** | Scalable to 10K users |

---

## 10. Single Point of Failure Analysis

### What Can Kill Your Entire App:

1. **Spotify Platform Outage**
   - Probability: Low (99.9% uptime)
   - Impact: 🔴 Total failure
   - Solution: None (you depend on them)

2. **Server Crashes**
   - Probability: Medium (if bugs exist)
   - Impact: 🔴 All rooms destroyed
   - Solution: Auto-restart, error monitoring

3. **Token Expiry Without Refresh**
   - Probability: High (every 1 hour)
   - Impact: 🔴 Users logged out mid-session
   - Solution: Implement token refresh

4. **WebSocket Connection Drops**
   - Probability: Medium (mobile networks)
   - Impact: 🟡 Lost sync until refresh
   - Solution: Auto-reconnect logic

---

## Conclusion

Your application has a **minimal, focused dependency footprint**:

**Strengths:**
- ✅ Only 14 direct dependencies (very lean)
- ✅ No bloated frameworks or unnecessary libraries
- ✅ $0 operating cost (perfect for MVP)
- ✅ Clear separation of concerns

**Weaknesses:**
- ⚠️ Total dependence on Spotify (single point of failure)
- ⚠️ No database = not scalable long-term
- ⚠️ No monitoring or error tracking
- ⚠️ One unused dependency (@spotify/web-api-ts-sdk)

**Recommendations:**

1. **Before launch:**
   - Add token refresh mechanism
   - Add auto-reconnect for WebSocket
   - Remove unused @spotify/web-api-ts-sdk

2. **After MVP validation:**
   - Migrate to Redis or PostgreSQL
   - Add error monitoring (Sentry)
   - Add analytics (PostHog, Plausible)

3. **For scale (>1,000 users):**
   - Upgrade to Vercel Pro or migrate backend
   - Implement rate limiting
   - Add caching layer

Your dependency architecture is **appropriate for an MVP** and can scale to thousands of users with minimal changes!
