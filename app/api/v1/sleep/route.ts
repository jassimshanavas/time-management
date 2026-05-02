import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/sleep
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('sleepEntries').where('userId', '==', userId).get();
  const entries = snap.docs
    .map((d) => ({ id: d.id, ...serialize(d.data()) }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return ok({ entries, count: entries.length });
});

// POST /api/v1/sleep
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { bedtime, wakeTime, quality, ...rest } = body as any;
  if (!bedtime || !wakeTime) return err('bedtime and wakeTime are required (ISO strings)');
  if (!quality || quality < 1 || quality > 5) return err('quality must be 1-5');

  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);
  const durationMins = Math.floor((wake.getTime() - bed.getTime()) / 60000);

  const ref = await db().collection('sleepEntries').add({
    ...rest,
    userId,
    bedtime: bed,
    wakeTime: wake,
    durationMins,
    quality,
    date: wake, // morning date
    createdAt: new Date(),
  });
  return ok({ id: ref.id, durationMins }, 201);
});
