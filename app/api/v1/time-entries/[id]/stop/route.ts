import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();

// POST /api/v1/time-entries/:id/stop
// Body: { notes?: string, productivityScore?: number }
export const POST = withAuth(async (req, { userId }) => {
  const parts = req.url.split('/time-entries/')[1]?.split('/');
  const id = parts?.[0];
  if (!id) return err('Missing entry id', 404);

  const ref = db().collection('timeEntries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Entry not found', 404);
  const data = snap.data()!;
  if (data.userId !== userId) return err('Forbidden', 403);
  if (!data.isRunning) return err('Timer is not running', 400);

  let body: any = {};
  try { body = await req.json(); } catch {}

  const endTime = new Date();
  const duration = Math.floor((endTime.getTime() - data.startTime.toDate().getTime()) / 60000);

  await ref.update({
    endTime,
    duration,
    isRunning: false,
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.productivityScore !== undefined && { productivityScore: body.productivityScore }),
  });

  fireWebhook(userId, 'timer.stopped', {
    id,
    category: data.category,
    duration,
    productivityScore: body.productivityScore,
  }).catch(() => {});

  return ok({ id, duration, endTime: endTime.toISOString() });
});
