import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import crypto from 'crypto';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k,
      Array.isArray(v) ? v.map((i: any) => (typeof i === 'object' && i !== null ? Object.fromEntries(Object.entries(i).map(([ik, iv]) => [ik, ts(iv)])) : i)) : ts(v) ?? v
    ])
  );
}

// GET /api/v1/goals
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('goals').where('userId', '==', userId).get();
  const goals = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
  return ok({ goals, count: goals.length });
});

// POST /api/v1/goals
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { title, ...rest } = body as any;
  if (!title) return err('title is required');

  const ref = await db().collection('goals').add({
    ...rest,
    title,
    userId,
    progress: rest.progress ?? 0,
    milestones: rest.milestones ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ok({ id: ref.id }, 201);
});
