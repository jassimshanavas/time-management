'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export default function ApiSettingsPage() {
  const { user, userData, updateUserData } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');
  
  // Telegram State
  const [telegramId, setTelegramId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    if (userData?.telegramChatId) {
      setTelegramId(userData.telegramChatId);
    }
  }, [userData]);

  async function getAuthHeader(): Promise<string | null> {
    if (!user) return null;
    const token = await user.getIdToken();
    return `Bearer ${token}`;
  }

  async function loadKeys() {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch('/api/v1/api-keys', { headers: { Authorization: auth } });
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys);
    }
    setLoading(false);
  }

  async function loadWebhooks() {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch('/api/v1/webhooks', { headers: { Authorization: auth } });
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data.webhooks);
    }
  }

  useEffect(() => {
    loadKeys();
    loadWebhooks();
  }, [user]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    });
    if (res.ok) {
      const data = await res.json();
      setRevealedKey(data.key);
      setNewKeyName('');
      await loadKeys();
      toast.success('API key created — copy it now!');
    } else {
      toast.error('Failed to create key');
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: auth } });
    if (res.ok) {
      await loadKeys();
      toast.success('Key revoked');
    }
  }

  async function createWebhook() {
    if (!webhookUrl.trim() || !webhookName.trim()) return;
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch('/api/v1/webhooks', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: webhookName, url: webhookUrl }),
    });
    if (res.ok) {
      setWebhookUrl('');
      setWebhookName('');
      await loadWebhooks();
      toast.success('Webhook registered');
    } else {
      const err = await res.json();
      toast.error(err.error ?? 'Failed to register webhook');
    }
  }

  async function deleteWebhook(id: string) {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE', headers: { Authorization: auth } });
    if (res.ok) {
      await loadWebhooks();
      toast.success('Webhook removed');
    }
  }

  async function saveTelegramId() {
    if (!telegramId.trim() && !userData?.telegramChatId) return;
    setSavingTelegram(true);
    try {
      await updateUserData({ telegramChatId: telegramId.trim() });
      toast.success('Telegram linked successfully!');
    } catch (e) {
      toast.error('Failed to link Telegram');
    }
    setSavingTelegram(false);
  }

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
    <div className="max-w-3xl mx-auto p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">API & Integrations</h1>
        <p className="text-white/50 text-sm">
          Connect TimeFlow to AI agents, automations (n8n, Zapier), and external tools.
        </p>
      </div>

      {/* Base URL */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
        <h2 className="font-semibold text-white">Base URL</h2>
        <code className="block bg-black/30 rounded-lg px-4 py-3 text-emerald-400 text-sm select-all">
          {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1
        </code>
        <p className="text-white/40 text-xs">
          All endpoints require <span className="text-white/60">Authorization: Bearer &lt;token&gt;</span> or{' '}
          <span className="text-white/60">X-API-Key: &lt;key&gt;</span> header.
        </p>
      </section>

      {/* API Keys */}
      <section className="space-y-4">
        <h2 className="font-semibold text-white text-lg">API Keys</h2>

        {/* Create new key */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
            placeholder="Key name (e.g. n8n automation, Claude Desktop)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : '+ New Key'}
          </button>
        </div>

        {/* Revealed key (show once) */}
        {revealedKey && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <p className="text-amber-400 text-sm font-medium">⚠ Copy this key now — it won't be shown again</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-amber-300 text-xs break-all select-all">{revealedKey}</code>
              <button
                onClick={() => { 
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(revealedKey); 
                    toast.success('Copied!'); 
                  } else {
                    toast.error('Cannot copy automatically (requires localhost or HTTPS). Please copy manually.');
                  }
                }}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            <button onClick={() => setRevealedKey(null)} className="text-white/30 text-xs hover:text-white/60">Dismiss</button>
          </div>
        )}

        {/* Keys list */}
        {loading ? (
          <div className="text-white/30 text-sm py-4 text-center">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="text-white/30 text-sm py-4 text-center">No API keys yet</div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{key.name}</span>
                    {key.active ? (
                      <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">active</span>
                    ) : (
                      <span className="text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded-full">revoked</span>
                    )}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
                {key.active && (
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Telegram Native Bot */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-white text-lg flex items-center gap-2">
            Telegram Integration <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">Native</span>
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Talk to Astra directly via Telegram. Send a message to your Telegram Bot to get your Chat ID, then paste it below.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-white/70 text-xs font-medium block mb-1">Telegram Chat ID</label>
            <input
              className="w-full max-w-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 123456789"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveTelegramId()}
            />
          </div>
          <button
            onClick={saveTelegramId}
            disabled={savingTelegram || telegramId === userData?.telegramChatId}
            className="bg-[#2AABEE] hover:bg-[#229ED9] disabled:opacity-40 text-white text-sm px-5 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(42,171,238,0.2)]"
          >
            {savingTelegram ? 'Linking...' : telegramId === userData?.telegramChatId ? 'Linked' : 'Link Account'}
          </button>
        </div>
      </section>

      {/* Webhooks */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-white text-lg">Webhooks</h2>
          <p className="text-white/40 text-xs mt-0.5">
            Receive real-time POST callbacks on task.completed, habit.checked_in, timer.stopped, and more.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
            placeholder="Name"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
          />
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
            placeholder="https://your-n8n.com/webhook/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createWebhook()}
          />
          <button
            onClick={createWebhook}
            disabled={!webhookUrl.trim() || !webhookName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Register
          </button>
        </div>

        {webhooks.length === 0 ? (
          <div className="text-white/30 text-sm py-4 text-center">No webhooks registered</div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{wh.name}</div>
                  <div className="text-white/40 text-xs truncate">{wh.url}</div>
                  <div className="text-white/30 text-xs mt-0.5">
                    {wh.events?.length} events · {wh.failureCount > 0 ? `${wh.failureCount} failures` : 'healthy'}
                  </div>
                </div>
                <button
                  onClick={() => deleteWebhook(wh.id)}
                  className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick reference */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
        <h2 className="font-semibold text-white">Quick Reference</h2>
        <div className="grid grid-cols-1 gap-2 text-xs font-mono">
          {[
            ['GET', '/api/v1/tasks', 'List tasks'],
            ['POST', '/api/v1/tasks', 'Create task'],
            ['POST', '/api/v1/tasks/:id/complete', 'Complete task'],
            ['POST', '/api/v1/habits/:id/check-in', 'Habit check-in'],
            ['POST', '/api/v1/time-entries', 'Start timer'],
            ['POST', '/api/v1/time-entries/:id/stop', 'Stop timer'],
            ['GET', '/api/v1/analytics/summary', 'Analytics (week/month/day)'],
            ['POST', '/api/v1/ai/parse-task', 'NLP → Task (AI)'],
            ['POST', '/api/v1/ai/breakdown', 'Auto subtasks (AI)'],
            ['GET', '/api/v1/export', 'Export all data'],
          ].map(([method, path, desc]) => (
            <div key={`${method}-${path}`} className="flex gap-3 items-start">
              <span className={`w-12 shrink-0 text-center rounded px-1 py-0.5 ${
                method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>{method}</span>
              <span className="text-white/70 w-56 shrink-0">{path}</span>
              <span className="text-white/40">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
