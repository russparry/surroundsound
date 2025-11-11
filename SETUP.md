# SyncSound Setup Instructions

## Prerequisites
- Node.js installed (v18 or higher recommended)
- Spotify Premium account (required for Web Playback SDK)
- **Each user must have their own Spotify Premium account**

## Setup Steps

### 1. Create a Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the details:
   - **App name**: SyncSound (or any name you prefer)
   - **App description**: Synchronized music playback across multiple devices
   - **Redirect URI**: `http://localhost:3000/auth` (copy this exactly!)
   - **API/SDKs**: Check "Web Playback SDK" and "Web API"
5. Click "Save"
6. On the app dashboard, click "Settings"
7. Copy your **Client ID** (you'll need this in the next step)

### 2. Configure Environment Variables

1. Open `.env.local` in the `surroundsound` folder
2. Replace `your_client_id_here` with your actual Client ID:
   ```
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=paste_your_client_id_here
   ```
3. Save the file
4. **Note**: The Client Secret is NOT needed (we're using PKCE OAuth flow for security)

### 3. Install Dependencies (if not already done)

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000`

## How to Use

### IMPORTANT: Multi-User Testing
**Each person MUST use their own Spotify Premium account!** The whole point of this app is that everyone authenticates with their own account, and the app synchronizes playback across all devices.

### For the Host:
1. Open `http://localhost:3000` in your browser
2. Click "Login with Spotify" and authorize with **YOUR** Spotify account
3. After login, click "Create Room"
4. Share the room code with your friends
5. Search for a song and click Play
6. The song will play synchronized across all connected devices

### For Participants (Friends):
1. Open `http://localhost:3000` in your browser (on their own device)
2. Click "Login with Spotify" and authorize with **THEIR OWN** Spotify account
3. Click "Join Room"
4. Enter the room code shared by the host
5. Wait for the host to play a song
6. Enjoy synchronized playback across all devices!

### Testing with Multiple Accounts
- **Correct**: Open multiple browsers/devices, each logged in with a different Spotify Premium account
- **Wrong**: ❌ Don't use the same Spotify account across multiple devices for testing

## Features

- ✅ Real-time room creation and joining
- ✅ Spotify OAuth authentication
- ✅ Web Playback SDK integration
- ✅ Synchronized playback with drift correction (every 2 seconds)
- ✅ Host controls (play, pause, search)
- ✅ Network latency compensation
- ✅ Automatic re-sync when drift exceeds 100ms

## Troubleshooting

### "Device not ready"
- Make sure you have Spotify Premium
- Check that you're logged in to Spotify
- Try refreshing the page

### "Room not found"
- Double-check the room code
- Make sure the host created the room before you joined

### Audio not synchronized
- The system automatically corrects drift every 2 seconds
- Small delays (network latency) are compensated for
- Bluetooth speakers may add extra delay

### Songs won't play
- Ensure all participants have Spotify Premium
- Check that the Spotify app is not open on another device (transfer playback to the web player)
- Make sure the redirect URI in your Spotify app matches exactly: `http://localhost:3000/auth`

## Architecture

```
[Host Device]
     ↓ (controls playback commands)
[Node.js Server + Socket.io WebSocket Server]
     ↓ (broadcasts playback commands)
[Friend Device 1] [Friend Device 2] ... [Friend Device N]
```

Each device runs the Spotify Web Playback SDK and receives commands via WebSocket to play/pause/seek at specific positions with timestamp-based latency compensation.
