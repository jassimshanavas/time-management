/**
 * API Key management — server-side Firestore operations
 */
import { getAdminFirestore } from './firebase-admin';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  scopes: string[];
  active: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

function generateKey(): string {
  return 'tf_' + crypto.randomBytes(32).toString('hex');
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ['*']
): Promise<ApiKey> {
  const db = getAdminFirestore();
  const key = generateKey();
  const docRef = await db.collection('apiKeys').add({
    userId,
    name,
    key,
    scopes,
    active: true,
    createdAt: new Date(),
  });
  return { id: docRef.id, userId, name, key, scopes, active: true, createdAt: new Date() };
}

export async function listApiKeys(userId: string): Promise<Omit<ApiKey, 'key'>[]> {
  const db = getAdminFirestore();
  const snap = await db.collection('apiKeys').where('userId', '==', userId).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      name: data.name,
      scopes: data.scopes,
      active: data.active,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      lastUsedAt: data.lastUsedAt?.toDate?.(),
    };
  });
}

export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const ref = db.collection('apiKeys').doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) return false;
  await ref.update({ active: false });
  return true;
}
