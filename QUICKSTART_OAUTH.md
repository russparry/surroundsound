# Quick Start: OAuth Authentication Setup

## What Changed?

The app has been updated to use **proper OAuth authentication** instead of manual token entry. This means:

✅ **Before**: Users manually copied tokens from the Spotify Web Console (often using the same account)
✅ **After**: Each user logs in with their own Spotify account via OAuth

## Why This Matters

The whole purpose of SyncSound is to let **multiple people** with **different Spotify accounts** play music in sync. Using the same account for testing defeats the purpose!

## Setup Instructions (5 minutes)

### Step 1: Create a Spotify App (One-Time Setup)

1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Fill in:
   - **Name**: SyncSound
   - **Description**: Synchronized playback
   - **Redirect URI**: `http://localhost:3000/auth` ← Copy this exactly!
   - Check "Web Playback SDK" and "Web API"
4. Click "Save"
5. Copy your **Client ID** from the dashboard

### Step 2: Configure Environment Variables

1. Open `.env.local` in the `surroundsound` folder
2. Replace `your_client_id_here` with your actual Client ID:
   ```env
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=abc123your_actual_client_id_here
   ```
3. Save the file

### Step 3: Run the App

```bash
npm run dev
```

The app will start at `http://localhost:3000`

### Step 4: Test with Multiple Users

#### Testing Locally (Same Computer)
1. **Browser 1** (e.g., Chrome): Login with Spotify Account A
2. **Browser 2** (e.g., Firefox or Incognito): Login with Spotify Account B
3. Create a room in Browser 1
4. Join the room in Browser 2 with the room code
5. Play music from Browser 1 and watch it sync!

#### Testing with Friends (Different Devices)
1. **You**: Open `http://localhost:3000`, login with your account, create room
2. **Friend**: Open `http://YOUR_LOCAL_IP:3000`, login with their account, join room
3. Play music and enjoy synchronized playback!

## Important Notes

### ✅ DO THIS:
- Each person logs in with their **own** Spotify Premium account
- Test with multiple browsers/devices using different accounts
- Share the room code (not the login credentials!)

### ❌ DON'T DO THIS:
- Don't use the same Spotify account on multiple devices
- Don't manually copy tokens anymore (OAuth handles this now)
- Don't share your Spotify login credentials

## Troubleshooting

### "Invalid Client ID"
- Make sure you copied the Client ID correctly from the Spotify Dashboard
- Check that there are no extra spaces in `.env.local`
- Restart the dev server after changing `.env.local`

### "Redirect URI Mismatch"
- In your Spotify app settings, make sure the Redirect URI is exactly: `http://localhost:3000/auth`
- No trailing slash, no extra characters

### "Device Not Ready"
- Make sure you have Spotify Premium
- Try refreshing the page
- Check that Spotify isn't playing on another device

## How the OAuth Flow Works

1. User clicks "Login with Spotify"
2. App redirects to Spotify authorization page
3. User authorizes the app with their Spotify account
4. Spotify redirects back to `/auth` with an authorization code
5. App exchanges the code for an access token
6. Token is stored in localStorage for this user
7. User can now create/join rooms with their own account!

## Files Changed

- `app/page.tsx`: Replaced manual token entry with OAuth login button
- `.env.local`: Added OAuth configuration (NEXT_PUBLIC_SPOTIFY_CLIENT_ID, NEXT_PUBLIC_REDIRECT_URI)
- `.env.example`: Updated to show correct environment variables
- `SETUP.md`: Updated setup instructions for OAuth

## Next Steps

1. Follow the setup instructions above
2. Get a friend with Spotify Premium to test with you
3. Each person logs in with their own account
4. Create a room and enjoy synchronized music!

---

**Remember**: The magic of this app is that each user has their own Spotify account, and the app keeps all playback synchronized in real-time! 🎵🔄
