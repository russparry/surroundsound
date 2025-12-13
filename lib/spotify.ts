// Spotify OAuth utilities

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-library-read',
].join(' ');

export function generateCodeVerifier(length: number = 128): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function redirectToSpotifyAuthorize() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem('code_verifier', codeVerifier);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  window.location.href = authUrl.toString();
}

export async function getAccessToken(code: string): Promise<string> {
  const codeVerifier = localStorage.getItem('code_verifier');

  if (!codeVerifier) {
    console.error('No code verifier found in localStorage');
    throw new Error('No code verifier found');
  }

  console.log('Exchanging authorization code for token...', {
    hasCode: !!code,
    hasVerifier: !!codeVerifier,
    clientId: CLIENT_ID ? 'set' : 'missing',
    redirectUri: REDIRECT_URI,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token exchange failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
    });
    throw new Error(`Failed to get access token: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Successfully got access token');

  // Store both access token and refresh token
  storeAccessToken(data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  localStorage.setItem('spotify_token_timestamp', Date.now().toString());

  // Clean up code verifier after successful exchange
  localStorage.removeItem('code_verifier');

  return data.access_token;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');

  if (!refreshToken) {
    console.warn('No refresh token available');
    return null;
  }

  console.log('Refreshing access token...');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Successfully refreshed access token');

    // Store new access token and update timestamp
    storeAccessToken(data.access_token);
    localStorage.setItem('spotify_token_timestamp', Date.now().toString());

    // Update refresh token if a new one was provided
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem('spotify_access_token');
}

export function storeAccessToken(token: string) {
  localStorage.setItem('spotify_access_token', token);
}

export function clearAccessToken() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_timestamp');
  localStorage.removeItem('code_verifier');
}
