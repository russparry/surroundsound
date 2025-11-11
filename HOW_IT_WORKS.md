# How SyncSound Works - Multi-Account Sync

## The Correct Approach (What You Wanted!)

**Each person uses their own Spotify Premium account**

### Example Scenario: You + 2 Friends

**Your Setup (Host):**
1. You go to https://developer.spotify.com/console/get-current-user/
2. Get YOUR access token for YOUR Spotify account
3. Open `http://localhost:3000`
4. Paste YOUR token
5. Create a room → Get code like `ABC123`

**Friend 1 (Guest):**
1. Goes to https://developer.spotify.com/console/get-current-user/
2. Gets THEIR OWN access token for THEIR Spotify account
3. Opens `http://YOUR_IP:3000` (or localhost if on same computer)
4. Pastes THEIR token
5. Joins room with code `ABC123`

**Friend 2 (Guest):**
1. Gets THEIR OWN access token for THEIR Spotify account
2. Opens the app
3. Pastes THEIR token
4. Joins room with code `ABC123`

**What Happens:**
- You (host) search and play "Song X"
- WebSocket sends command: "Play Song X at 0ms"
- Friend 1's Spotify plays Song X at 0ms on THEIR account
- Friend 2's Spotify plays Song X at 0ms on THEIR account
- All 3 devices play in sync!
- **Each person is using their own Spotify Premium subscription**

---

## How The Sync Works

### When Host Plays a Song:

```
[Your Device - Host]
  1. You click "Play" on Song X
  2. Sends command to server:
     {
       action: 'play-track',
       trackUri: 'spotify:track:123',
       position: 0,
       timestamp: 1234567890
     }

[Server - WebSocket]
  3. Broadcasts to all members in room

[Friend's Device - Guest]
  4. Receives command
  5. Calculates network latency
  6. Plays Song X on THEIR Spotify account
  7. Adjusts position to account for latency
```

### Drift Correction (Every 2 Seconds):

```
[Your Device - Host]
  - Every 2 seconds: Sends current position
  - Example: "I'm at 5432ms"

[Friend's Device - Guest]
  - Receives: "Host is at 5432ms"
  - Checks own position: "I'm at 5550ms"
  - Calculates drift: 118ms
  - If drift > 100ms: Seeks to 5432ms
  - Stays in sync automatically!
```

---

## Requirements

### Each Person Needs:
- ✅ **Spotify Premium** account (required for Web Playback SDK)
- ✅ **Their own access token** (gets from Spotify Developer Console)
- ✅ **Device with browser** (phone, laptop, tablet)
- ✅ **Same WiFi network** (for local testing)

### What They DON'T Need:
- ❌ Same Spotify account
- ❌ Spotify app installed
- ❌ Complex OAuth setup
- ❌ App installation

---

## Testing Scenarios

### Scenario 1: Testing Alone (Multiple Devices You Own)

**Your Setup:**
- Get ONE token from your Spotify account
- Use the SAME token on all YOUR devices
  - Your computer: `http://localhost:3000` → Paste token → Create room
  - Your phone: `http://YOUR_IP:3000` → Paste SAME token → Join room
  - Your tablet: `http://YOUR_IP:3000` → Paste SAME token → Join room

**Result:** All YOUR devices play music from YOUR account in sync

**Note:** This technically violates Spotify's "one device at a time" rule, but works for testing purposes. For actual use with friends, use Scenario 2.

---

### Scenario 2: Testing with Friends (Correct Way)

**Setup:**
- Each person gets their own token from their own Spotify Premium account
- Each person has their own device

**Steps:**
1. **You (Host):**
   - Get YOUR token
   - Create room on `http://localhost:3000`
   - Share code with friends

2. **Friend 1:**
   - Gets THEIR token from THEIR Spotify account
   - Joins room at `http://YOUR_IP:3000`
   - Pastes THEIR token

3. **Friend 2:**
   - Gets THEIR token from THEIR Spotify account
   - Joins room at `http://YOUR_IP:3000`
   - Pastes THEIR token

4. **You (Host):**
   - Search for a song
   - Click "Play"

5. **Result:**
   - All 3 devices play the same song at the same time
   - Each person is using their own Spotify account
   - Creates a surround sound effect!

---

## Why This Approach is Great

### ✅ Respects Spotify's License
- Each person uses their own Premium account
- No account sharing violations
- Proper usage of Spotify API

### ✅ Easy to Use
- No complex setup
- Just paste a token and join
- Works on any device with a browser

### ✅ True Surround Sound
- Multiple speakers playing simultaneously
- Automatic drift correction
- Sub-100ms sync accuracy

### ✅ Privacy
- Each person controls their own account
- No access to others' playlists/data
- Just playback sync

---

## Limitations & Solutions

### ❌ Everyone needs Spotify Premium

**Why:** Web Playback SDK requires Premium
**Solution:** This is a Spotify requirement, can't be bypassed
**Alternative:** For demos, use Scenario 1 (one account, multiple devices)

### ❌ Tokens expire after 1 hour

**Why:** Temporary tokens from Developer Console
**Solution:**
- For testing: Just get a new token every hour
- For production: We can implement proper OAuth (later)

### ❌ Everyone needs to paste a token

**Why:** Each person needs authentication for their Spotify account
**Solution:** This is already the simplest approach for testing
**Future:** Can add "Login with Spotify" button (proper OAuth)

### ❌ Requires same WiFi network (for local testing)

**Why:** Using localhost/local IP
**Solution:**
- For testing: Use local network (works fine)
- For production: Deploy to Vercel (public URL)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    YOUR COMPUTER                    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │         Node.js Server (Port 3000)         │    │
│  │         + Socket.io WebSocket Server       │    │
│  └───────────┬────────────────────────┬───────┘    │
│              │                        │             │
└──────────────┼────────────────────────┼─────────────┘
               │                        │
         WebSocket                 WebSocket
               │                        │
    ┌──────────▼─────────┐   ┌─────────▼──────────┐
    │   YOUR DEVICE      │   │  FRIEND'S DEVICE   │
    │   (HOST)           │   │  (GUEST)           │
    │                    │   │                    │
    │  YOUR Spotify ◄────┼───┼────► THEIR Spotify│
    │  Premium Account   │   │  Premium Account  │
    │                    │   │                    │
    │  YOUR Token        │   │  THEIR Token      │
    │                    │   │                    │
    │  Controls          │   │  Listens & Syncs  │
    │  Playback          │   │  to Host          │
    └────────────────────┘   └───────────────────┘
```

---

## Summary

**The Magic:**
- Host plays a song on THEIR Spotify account
- Server broadcasts "play this song" command
- All guests play the same song on THEIR OWN Spotify accounts
- Everyone's playback syncs automatically
- Result: Multiple speakers playing the same song at the same time!

**No sharing of accounts, no licensing violations, everyone uses their own Spotify Premium!**

This is exactly what you wanted and it's the right way to do it! 🎵
