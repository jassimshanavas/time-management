import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { buildServerAstraContext } from '@/lib/server-astra-context';
import { getAstraResponseWithTools } from '@/lib/gemini';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper to send a message back to Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// POST /api/v1/webhooks/telegram
// Unauthenticated endpoint called directly by Telegram servers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Telegram sends message updates
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true }); // Acknowledge to Telegram so it doesn't retry
    }

    const chatId = body.message.chat.id;
    const text = body.message.text;

    // 1. Find which TimeFlow user this Telegram Chat ID belongs to
    const db = getAdminFirestore();
    const usersSnap = await db.collection('users').where('telegramChatId', '==', String(chatId)).limit(1).get();

    if (usersSnap.empty) {
      // User hasn't linked their account yet
      await sendTelegramMessage(
        chatId, 
        `Welcome to Astra! 🧠\n\nI don't recognize this Telegram account. To link it to your TimeFlow app, please go to Settings -> Integrations and save this Chat ID:\n\n\`${chatId}\``
      );
      return NextResponse.json({ ok: true });
    }

    const userId = usersSnap.docs[0].id;

    // Send a typing indicator to Telegram so the user knows Astra is thinking
    if (TELEGRAM_BOT_TOKEN) {
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      }).catch(() => {});
    }

    // 2. Build Server-Side Astra Context
    const ctx = await buildServerAstraContext(userId);

    // 3. Run Astra's Agent Loop
    const result = await getAstraResponseWithTools(text, [], ctx);

    // 4. Send Astra's final response back to Telegram
    let reply = result.response;
    
    // If Astra performed actions, append a small summary emoji footer
    if (result.toolActions && result.toolActions.length > 0) {
      const summaries = result.toolActions.map(a => `${a.emoji} ${a.summary}`).join('\n');
      reply += `\n\n_${summaries}_`;
    }

    await sendTelegramMessage(chatId, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Webhooks
  }
}
