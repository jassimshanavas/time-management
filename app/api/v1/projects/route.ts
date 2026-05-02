import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/projects
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('projects')
    .where('memberIds', 'array-contains', userId)
    .get();
  const projects = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
  return ok({ projects, count: projects.length });
});

// POST /api/v1/projects
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { name, ...rest } = body as any;
  if (!name) return err('name is required');

  const ref = await db().collection('projects').add({
    ...rest,
    name,
    userId,
    memberIds: [userId],
    members: [{ userId, role: 'owner', joinedAt: new Date() }],
    status: rest.status ?? 'active',
    visibility: rest.visibility ?? 'private',
    color: rest.color ?? '#6366f1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ok({ id: ref.id }, 201);
});
