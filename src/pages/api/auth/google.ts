import type { APIRoute } from 'astro';
import sql from '../../../utils/db';

const GOOGLE_CLIENT_ID =
  import.meta.env.GOOGLE_CLIENT_ID ||
  import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

// ---------------------------------------------------------------------------
// Verify a Google ID token (JWT) using Google's public JWKS.
// Uses the Web Crypto API so it works in any serverless / edge environment
// without needing google-auth-library's outbound HTTPS dependencies.
// ---------------------------------------------------------------------------
async function verifyGoogleToken(idToken: string): Promise<{
  email: string;
  name: string;
  sub: string;
  picture?: string;
} | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    // --- 1. Decode header to get key id (kid) ---
    const headerJson = JSON.parse(
      atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))
    );
    const kid: string = headerJson.kid;

    // --- 2. Fetch Google's public JWKS ---
    const certsRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!certsRes.ok) {
      console.error('Google JWKS fetch failed:', certsRes.status);
      return null;
    }
    const certs = (await certsRes.json()) as { keys: JsonWebKey[] };

    const jwk = certs.keys.find((k: any) => k.kid === kid);
    if (!jwk) {
      console.error('No matching JWK found for kid:', kid);
      return null;
    }

    // --- 3. Import the public key ---
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // --- 4. Verify the signature ---
    const encoder = new TextEncoder();
    const signingInput = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signatureBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      signingInput
    );

    if (!isValid) {
      console.error('Google token signature verification failed');
      return null;
    }

    // --- 5. Decode and validate the payload ---
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    const now = Math.floor(Date.now() / 1000);

    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error('Google token audience mismatch. Got:', payload.aud);
      return null;
    }
    if (
      payload.iss !== 'accounts.google.com' &&
      payload.iss !== 'https://accounts.google.com'
    ) {
      console.error('Google token invalid issuer:', payload.iss);
      return null;
    }
    if (payload.exp < now) {
      console.error('Google token expired');
      return null;
    }

    return {
      email: payload.email,
      name: payload.name ?? payload.email,
      sub: payload.sub,
      picture: payload.picture,
    };
  } catch (err) {
    console.error('Google token verification error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/google
// ---------------------------------------------------------------------------
export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  try {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Login: PUBLIC_GOOGLE_CLIENT_ID is not set');
      return new Response(
        JSON.stringify({ message: 'Server misconfiguration: Google Client ID missing.' }),
        { status: 500 }
      );
    }

    const body = await request.json();
    // Support both { token } (current) and { credential } (legacy) field names
    const idToken: string | undefined = body.token ?? body.credential;

    if (!idToken) {
      return new Response(
        JSON.stringify({ message: 'No token provided' }),
        { status: 400 }
      );
    }

    // Verify the token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return new Response(
        JSON.stringify({ message: 'Invalid or expired Google token. Please try again.' }),
        { status: 401 }
      );
    }

    const { email, name, sub: googleId, picture = null } = googleUser;

    // Check if user already exists
    const existing = await sql`
      SELECT id, email, full_name as "fullName", office
      FROM user_accounts
      WHERE email = ${email}
    `;

    let user: { id: number; email: string; fullName: string; office: string };

    if (existing.length > 0) {
      // Existing user — sync google_id and picture if not yet stored
      await sql`
        UPDATE user_accounts
        SET
          google_id = COALESCE(NULLIF(google_id, ''), ${googleId}),
          picture   = COALESCE(picture, ${picture})
        WHERE email = ${email}
      `;
      user = existing[0] as typeof user;
    } else {
      // New user — create account (Google-only, no password)
      const result = await sql`
        INSERT INTO user_accounts (email, full_name, office, google_id, picture, password)
        VALUES (${email}, ${name}, ${'(via Google)'}, ${googleId}, ${picture}, NULL)
        RETURNING id, email, full_name as "fullName", office
      `;
      user = result[0] as typeof user;
    }

    // Set session cookie
    cookies.set('session', `user:${user.id}`, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return new Response(
      JSON.stringify({ message: 'Google login successful', user }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google auth error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error during Google login.' }),
      { status: 500 }
    );
  }
};
