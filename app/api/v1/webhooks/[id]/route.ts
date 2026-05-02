import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
const whId = (url: string) => url.split('/webhooks/')[1]?.split('/')[0];

// DELETE /api/v1/webhooks/:id — revoke/delete webhook
export const DELETE = withAuth(async (req, { userId }) => {
  const id = whId(req.url);
  if (!id) return err('Missing webhook id', 404);
  const ref = db().collection('webhooks').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Webhook not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});

// PATCH /api/v1/webhooks/:id — enable/disable, update url/events
export const PATCH = withAuth(async (req, { userId }) => {
  const id = whId(req.url);
  if (!id) return err('Missing webhook id', 404);
  const ref = db().collection('webhooks').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Webhook not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any) };
  delete updates.userId; delete updates.id;
  await ref.update(updates);
  return ok({ id, updated: true });
});
