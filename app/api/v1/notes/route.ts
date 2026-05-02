import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/notes  — ?tag=xyz  &pinned=true
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  let q = db().collection('notes').where('userId', '==', userId) as FirebaseFirestore.Query;
  const pinned = searchParams.get('pinned');
  if (pinned === 'true') q = q.where('pinned', '==', true);

  const snap = await q.get();
  let notes = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));

  const tag = searchParams.get('tag');
  if (tag) notes = notes.filter((n: any) => n.tags?.includes(tag));

  return ok({ notes, count: notes.length });
});

// POST /api/v1/notes
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { title, content, ...rest } = body as any;
  if (!title) return err('title is required');

  const ref = await db().collection('notes').add({
    ...rest,
    title,
    content: content ?? '',
    userId,
    tags: rest.tags ?? [],
    pinned: rest.pinned ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ok({ id: ref.id }, 201);
});
