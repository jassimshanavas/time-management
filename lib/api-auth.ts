/**
 * API Authentication Middleware
 *
 * Supports two authentication modes:
 *   1. Firebase ID Token  →  Authorization: Bearer <firebase_id_token>
 *   2. Long-lived API Key →  X-API-Key: <api_key>
 *
 * Returns the verified userId on success, or throws a Response with 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from './firebase-admin';

export type AuthResult = {
  userId: string;
  authMethod: 'firebase-token' | 'api-key';
};

export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  // --- Try Internal Loopback first ---
  const internalSecret = req.headers.get('x-internal-secret');
  if (internalSecret && process.env.INTERNAL_API_SECRET && internalSecret === process.env.INTERNAL_API_SECRET) {
    const internalUserId = req.headers.get('x-internal-user-id');
    if (internalUserId) return { userId: internalUserId, authMethod: 'api-key' };
  }

  // --- Try API Key ---
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    const db = getAdminFirestore();
    const snap = await db.collection('apiKeys')
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (!snap.empty) {
      const data = snap.docs[0].data();
      // Update last-used timestamp (fire and forget)
      snap.docs[0].ref.update({ lastUsedAt: new Date() }).catch(() => {});
      return { userId: data.userId, authMethod: 'api-key' };
    }
    throw authError('Invalid or inactive API key');
  }

  // --- Try Firebase ID Token ---
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      return { userId: decoded.uid, authMethod: 'firebase-token' };
    } catch {
      throw authError('Invalid or expired Firebase token');
    }
  }

  throw authError('Missing authentication — provide Authorization: Bearer <token> or X-API-Key: <key>');
}

function authError(message: string): Response {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Wraps a route handler with auth. Passes userId to handler on success.
 * Usage:
 *   export const GET = withAuth(async (req, { userId }) => { ... });
 */
export function withAuth(
  handler: (req: NextRequest, ctx: { userId: string }) => Promise<Response>
) {
  return async (req: NextRequest, routeCtx?: unknown): Promise<Response> => {
    try {
      const auth = await authenticateRequest(req);
      return await handler(req, { userId: auth.userId });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error('[API Auth Error]', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/** Standard JSON success response */
export function ok(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status });
}

/** Standard JSON error response */
export function err(message: string, status = 400): Response {
  return NextResponse.json({ error: message }, { status });
}

/** Parse request body safely */
export async function parseBody<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
