# SyncSound Testing Guide - Step by Step

This guide will walk you through testing SyncSound on multiple devices. No complicated setup needed!

## PART 1: Getting Your Spotify Access Token (5 minutes)

### What is an Access Token?
An access token is like a temporary password that lets the app control Spotify playback on your behalf. It lasts for **1 hour**.

### How to Get It:

1. **Open this link in your browser:**
   https://developer.spotify.com/console/get-current-user/

2. **Click the green "Get Token" button** (top right)

3. **A popup will appear asking for permissions. Check these boxes:**
   - ☑ streaming
   - ☑ user-read-email
   - ☑ user-read-private
   - ☑ user-modify-playback-state
   - ☑ user-read-playback-state

4. **Click "Request Token"**

5. **Log in to Spotify** (if asked)

6. **Copy the long string of text** that appears - this is your access token!
   - It looks something like: `BQD4O6e...` (about 200 characters long)

7. **IMPORTANT:** This token expires in 1 hour. When it expires, just come back to this page and get a new one!

---

## PART 2: Testing on Your Computer (2 minutes)

### Step 1: Start the Server

1. Open your terminal/command prompt
2. Navigate to the surroundsound folder:
   ```bash
   cd C:\Users\russp\OneDrive\Documents\School\strat490\firstapp\surroundsound
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Wait until you see: `> Ready on http://localhost:3000`

### Step 2: Open the App

1. Open your browser (Chrome, Edge, Firefox)
2. Go to: `http://localhost:3000`
3. You should see the SyncSound homepage!

### Step 3: Paste Your Token

1. Paste your access token from Part 1 into the text box
2. Click "Set Token & Continue"
3. You should now see the "Create Room" and "Join Room" buttons!

### Step 4: Test with Multiple Browser Windows

**To test sync on the same computer:**
1. Open a **second browser window** (or use Incognito mode)
2. Go to `http://localhost:3000` again
3. Paste the token again (yes, you can use the same token on multiple windows!)

**Now test the room:**
- **Window 1 (Host):** Click "Create Room" → Note the room code
- **Window 2 (Guest):** Click "Join Room" → Enter the code
- **Window 1 (Host):** Search for a song and click "Play"
- **Both windows should play the same song in sync!** 🎵

---

## PART 3: Testing on Multiple Devices (10 minutes)

### Why doesn't localhost work on other devices?
"localhost" only works on the computer running the server. Other devices need to connect using your computer's **local IP address**.

### Step 1: Find Your Computer's IP Address

**On Windows:**
1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your network adapter (WiFi or Ethernet)
4. It will look like: `192.168.1.100` or similar
5. **Write this down!**

**On Mac/Linux:**
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your local IP (starts with 192.168 or 10.0)

### Step 2: Update Your Server Settings

1. **Stop the server** if it's running (press Ctrl+C in the terminal)

2. **Edit the `server.js` file** and change the hostname:
   - Find the line: `const hostname = 'localhost';`
   - Change it to: `const hostname = '0.0.0.0';`
   - This tells the server to accept connections from other devices

3. **Restart the server:**
   ```bash
   npm run dev
   ```

### Step 3: Connect from Other Devices

**Important:** All devices must be on the **same WiFi network**!

**On each device (phone, laptop, etc.):**
1. Open a browser
2. Instead of `localhost:3000`, go to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`
3. Paste your Spotify access token
4. Join the same room!

**Example Test Scenario:**
- **Your Computer (Host):** `http://192.168.1.100:3000` → Create Room → Code: `ABC123`
- **Friend's Phone:** `http://192.168.1.100:3000` → Join Room → Enter `ABC123`
- **Another Friend's Laptop:** `http://192.168.1.100:3000` → Join Room → Enter `ABC123`
- **Host:** Search and play a song
- **All devices play in sync!**

---

## PART 4: Troubleshooting

### ❌ "localhost:3000 refused to connect"

**Try these:**
1. Make sure the server is running (`npm run dev`)
2. Try a different browser (Chrome, Firefox, Edge)
3. Clear your browser cache (Ctrl+Shift+Delete)
4. Check if another app is using port 3000 (close other servers)

### ❌ "Can't connect from my phone"

**Check:**
1. Phone and computer are on the **same WiFi** network
2. You changed `hostname` to `'0.0.0.0'` in `server.js`
3. You're using your computer's **IP address**, not "localhost"
4. Your firewall isn't blocking port 3000 (try temporarily disabling it)

### ❌ "Device not ready" or "Premium Required"

**This means:**
- You don't have Spotify Premium (required for Web Playback SDK)
- Or the token expired (get a new one from Part 1)
- Or you're logged into Spotify elsewhere (close other Spotify apps)

### ❌ "Songs not playing in sync"

**Remember:**
- The app syncs every 2 seconds
- There will be a small delay (~100-200ms) due to network latency
- Bluetooth speakers add extra delay (use wired speakers if possible)
- If drift is too large, devices will automatically re-sync

### ❌ "Token expired"

**Solution:**
- Tokens last 1 hour
- Go back to Part 1 and get a new token
- Paste the new token on each device

---

## PART 5: Testing Multiple People

### Scenario 1: You and 2 friends in the same room

**Setup:**
- All devices on same WiFi
- Host creates room on computer: `http://YOUR_IP:3000`
- Friend 1 joins on phone: `http://YOUR_IP:3000`
- Friend 2 joins on laptop: `http://YOUR_IP:3000`

**Each person needs:**
- Their own Spotify Premium account
- Their own access token (each person gets their own from the Spotify console)

**Test:**
- Host plays a song
- All 3 devices should play simultaneously
- Walk around the room - surround sound effect! 🎶

### Scenario 2: Testing alone with 3 devices

You can test with multiple devices you own:
- Your computer
- Your phone
- Your tablet

**Note:** Use the same access token on all devices (it's your token!)

---

## Quick Reference

### Get Access Token
→ https://developer.spotify.com/console/get-current-user/

### Start Server
```bash
npm run dev
```

### Connect from Same Computer
→ `http://localhost:3000`

### Connect from Other Devices
→ `http://YOUR_IP_ADDRESS:3000`

### Find Your IP
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

---

## What's Next?

Once you've tested and verified it works:
1. We can deploy this to Vercel (so you don't need localhost)
2. Add proper OAuth (so tokens don't expire every hour)
3. Add more features (volume control, playlists, etc.)

But for now, this setup is **perfect for testing the core functionality!**
