import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { buildServerAstraContext } from '@/lib/server-astra-context';
import { getAstraResponseWithTools, type ChatMessage } from '@/lib/gemini';

// POST /api/v1/ai/chat
// Body: { message: string, history?: ChatMessage[] }
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<{ message: string; history?: ChatMessage[] }>(req);
  
  if (!body || !body.message) {
    return err('Missing message in request body');
  }

  // 1. Build the server-side context for Astra using live Firestore data
  const ctx = await buildServerAstraContext(userId);

  // 2. We use an empty array to track server-side tool execution logs internally
  const internalToolActions: any[] = [];

  // 3. Run Astra's brain
  const result = await getAstraResponseWithTools(
    body.message,
    body.history || [],
    ctx,
    (action) => {
      internalToolActions.push(action);
      console.log(`[Astra Server Tool Executed] ${action.tool} -> ${action.success ? 'Success' : 'Failed'}`);
    }
  );

  return ok({
    response: result.response,
    actionsPerformed: result.toolActions,
  });
});
