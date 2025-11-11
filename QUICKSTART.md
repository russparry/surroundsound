# SyncSound - Quick Start (5 Minutes!)

## Step 1: Get Your Spotify Token (2 min)

1. Open: https://developer.spotify.com/console/get-current-user/
2. Click green **"Get Token"** button
3. Check these 5 boxes:
   - streaming
   - user-read-email
   - user-read-private
   - user-modify-playback-state
   - user-read-playback-state
4. Click **"Request Token"**
5. **Copy the long token** (starts with "BQD...")

## Step 2: Start the App (1 min)

Open terminal and run:
```bash
cd C:\Users\russp\OneDrive\Documents\School\strat490\firstapp\surroundsound
npm run dev
```

Wait for: `> Ready on http://0.0.0.0:3000`

## Step 3: Test It! (2 min)

1. Open browser: `http://localhost:3000`
2. **Paste your token** in the box
3. Click **"Set Token & Continue"**
4. Click **"Create Room"** → You'll get a code like `ABC123`

## Step 4: Test Sync (Open 2nd Browser Window)

1. Open **another browser window** (or Incognito)
2. Go to `http://localhost:3000`
3. Paste the **same token**
4. Click **"Join Room"** → Enter the code from Step 3
5. In the first window (host): **Search for a song and click Play**
6. **Both windows should play in sync!** 🎵

---

## Testing on Multiple Devices (Your Phone, Friend's Laptop, etc.)

### Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" → Something like `192.168.1.100`

**Mac:**
```bash
ifconfig
```

### On Other Devices

1. Make sure they're on the **same WiFi** as your computer
2. Open browser and go to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`
3. Each person:
   - Gets their own token from https://developer.spotify.com/console/get-current-user/
   - Needs Spotify Premium
4. Host creates room, others join with the code

---

## Common Issues

**"Refused to connect"**
- Make sure server is running (`npm run dev`)
- Try Chrome or Edge browser
- Check firewall isn't blocking port 3000

**"Device not ready"**
- You need Spotify Premium
- Close Spotify app on other devices
- Token might have expired (get new one)

**"Not syncing well"**
- App syncs every 2 seconds automatically
- Bluetooth speakers add delay (use wired if possible)

---

## Important Notes

✅ **Each person needs:**
- Spotify Premium account
- Their own access token
- Same WiFi network (for multi-device testing)

⏰ **Tokens expire in 1 hour**
- Just get a new one when it expires

🎵 **How sync works:**
- Host plays a song
- All devices receive the command via WebSocket
- Automatic drift correction every 2 seconds
- If any device drifts > 100ms, it auto-corrects

---

That's it! Read **TESTING_GUIDE.md** for detailed troubleshooting and advanced testing scenarios.
