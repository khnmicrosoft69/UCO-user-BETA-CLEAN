import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import 'dotenv/config';

/**
 * Gets the real current time from Google's servers via an HTTP HEAD request.
 * This bypasses any system clock drift issues.
 */
async function getRealTimeSeconds(): Promise<number> {
  try {
    // Use a HEAD request to Google — the 'Date' header gives us the real server time
    const res = await fetch('https://www.googleapis.com/oauth2/v4/token', {
      method: 'HEAD',
    }).catch(() => null);

    if (res?.headers?.get('date')) {
      return Math.floor(new Date(res.headers.get('date')!).getTime() / 1000);
    }
  } catch {}

  // Fallback: try worldtimeapi
  try {
    const res = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC');
    const data = await res.json();
    return Math.floor(new Date(data.datetime).getTime() / 1000);
  } catch {}

  // Last resort: use system time (will fail if clock is wrong)
  return Math.floor(Date.now() / 1000);
}

/**
 * Manually creates a Google OAuth2 access token by constructing a JWT
 * with the correct timestamps from an external time source.
 * This completely bypasses the google-auth-library's internal Date.now() usage.
 */
async function getAccessToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  const nowSeconds = await getRealTimeSeconds();

  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600, // 1 hour from now
  };

  const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });

  // Exchange the self-signed JWT for an access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error} - ${data.error_description}`);
  }

  return data.access_token;
}

/**
 * Returns an authenticated Google Drive service instance.
 * Uses manual JWT construction to avoid system clock issues.
 */
export async function getDriveService() {
  const accessToken = await getAccessToken();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.drive({ version: 'v3', auth });
}
