import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/gamification
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('gamification').doc(userId).get();
  if (!snap.exists) return ok({ gamification: null, message: 'Not initialized yet' });
  return ok({ gamification: { id: snap.id, ...serialize(snap.data()!) } });
});

// POST /api/v1/gamification/xp
// Body: { amount: number, source: string, description?: string }
export const POST = withAuth(async (req, { userId }) => {
  const parts = req.url.split('/gamification/')[1]?.split('/');
  const action = parts?.[0];

  if (action !== 'xp') return err('Only /xp action is supported here', 400);

  const body = await parseBody<{ amount: number; source: string; description?: string }>(req);
  if (!body?.amount || !body?.source) return err('amount and source are required');
  if (body.amount <= 0) return err('amount must be positive');

  const ref = db().collection('gamification').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return err('Gamification not initialized — use the app first', 404);

  const data = snap.data()!;
  const newXP = (data.xp ?? 0) + body.amount;

  // Simple level calculation (mirrors lib/gamification.ts)
  const level = Math.floor(Math.sqrt(newXP / 100)) + 1;

  await ref.update({ xp: newXP, level, updatedAt: new Date() });

  fireWebhook(userId, 'xp.awarded', {
    amount: body.amount,
    source: body.source,
    description: body.description,
    totalXP: newXP,
    level,
  }).catch(() => {});

  return ok({ xp: newXP, level, awarded: body.amount });
});
