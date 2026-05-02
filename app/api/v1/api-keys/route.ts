import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/api-keys';

// GET /api/v1/api-keys — list keys (key values hidden)
export const GET = withAuth(async (req, { userId }) => {
  const keys = await listApiKeys(userId);
  return ok({ keys, count: keys.length });
});

// POST /api/v1/api-keys — create a new key
// Body: { name: string, scopes?: string[] }
// Returns: key value ONCE — store it securely
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<{ name: string; scopes?: string[] }>(req);
  if (!body?.name) return err('name is required');

  const apiKey = await createApiKey(userId, body.name, body.scopes);

  return ok({
    id: apiKey.id,
    name: apiKey.name,
    key: apiKey.key,  // Only returned once!
    scopes: apiKey.scopes,
    warning: 'Store this key securely — it will not be shown again.',
  }, 201);
});

// DELETE /api/v1/api-keys/:id — revoke key
export const DELETE = withAuth(async (req, { userId }) => {
  const keyId = req.url.split('/api-keys/')[1]?.split('/')[0];
  if (!keyId) return err('Missing key id', 404);
  const revoked = await revokeApiKey(keyId, userId);
  if (!revoked) return err('Key not found or not owned by you', 404);
  return ok({ id: keyId, revoked: true });
});
