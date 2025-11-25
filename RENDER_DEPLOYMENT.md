# Render Deployment Guide for SyncSound

This guide will help you deploy SyncSound to Render.com.

## Prerequisites

1. GitHub account with your code pushed to a repository
2. Render account (sign up at [render.com](https://render.com) - you can use your GitHub account)
3. All environment variables configured (Supabase, Stripe, Spotify)

## Deployment Steps

### Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Create a New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" button
3. Select "Web Service"
4. Connect your GitHub repository

### Step 3: Configure the Service

Fill in the following settings:

- **Name**: `syncsound` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (unless your app is in a subdirectory)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (or upgrade as needed)

### Step 4: Add Environment Variables

In the "Environment" section, add these environment variables:

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Stripe:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_your_key
STRIPE_SECRET_KEY=sk_test_or_live_your_key
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id
```

**Spotify:**
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

**App URLs** (IMPORTANT - Replace with your actual Render URL):
```
NEXT_PUBLIC_REDIRECT_URI=https://your-app-name.onrender.com/auth
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
```

**Other:**
```
NODE_ENV=production
```

### Step 5: Update Spotify App Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add your Render URL to "Redirect URIs":
   ```
   https://your-app-name.onrender.com/auth
   ```
5. Save changes

### Step 6: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your app
3. Watch the logs for any errors

### Step 7: Verify Deployment

Once deployed, test the following:

1. Visit your Render URL (e.g., `https://your-app-name.onrender.com`)
2. Try registering a new account
3. Try logging in
4. Test the subscription flow with Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Connect Spotify and test room functionality

## Important Notes

### Free Tier Limitations

- Render's free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- WebSocket connections work on free tier

### Custom Domain (Optional)

1. Go to your service settings
2. Click "Custom Domains"
3. Follow Render's instructions to add your domain

### Automatic Deploys

Render automatically deploys when you push to your main branch. To disable:

1. Go to service settings
2. Toggle off "Auto-Deploy"

### Monitoring

View your app's performance:

1. Go to Render Dashboard
2. Click on your service
3. View "Metrics" tab for CPU, memory, and bandwidth usage

## Troubleshooting

### Build Fails

Check the build logs for specific errors. Common issues:

- Missing dependencies in `package.json`
- TypeScript errors
- Environment variables not set

### App Doesn't Load

- Check environment variables are set correctly
- Verify Spotify redirect URI matches exactly
- Check server logs in Render dashboard

### Spotify Login Fails

- Verify `NEXT_PUBLIC_REDIRECT_URI` matches the one in Spotify dashboard
- Make sure you added the Render URL to Spotify's allowed redirect URIs

### Stripe Checkout Fails

- Verify all Stripe environment variables are set
- Check that `NEXT_PUBLIC_APP_URL` is correct
- Make sure you're using test keys in test mode

## Updating Your App

To deploy updates:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically detect the push and redeploy.

## Cost Estimates

- **Free Tier**: $0/month (with limitations)
- **Starter**: $7/month (512 MB RAM, no sleep)
- **Standard**: $25/month (2 GB RAM, better performance)

For production with real users, we recommend at least the Starter tier.
