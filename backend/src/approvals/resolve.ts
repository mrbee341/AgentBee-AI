import type { Api } from 'grammy';
import { recordAudit } from '../db/audit.js';
import type { Intent } from '../db/schema.js';
import { WRITE_TOOLS } from '../tools/write-tools.js';
import { setIntentOutcome } from './ledger.js';

export async function settleIntent(intent: Intent, decision: 'approved' | 'rejected'): Promise<string> {
  await recordAudit({
    userId: intent.userId,
    actor: 'user',
    action: `intent.${decision}`,
    target: intent.id,
    after: { tool: intent.tool, preview: intent.preview },
  });

  if (decision === 'rejected') return 'Rejected. Nothing was changed.';
  return `Approved. ${await executeIntent(intent)}`;
}

async function executeIntent(intent: Intent): Promise<string> {
  const tool = WRITE_TOOLS[intent.tool];
  if (!tool) {
    await setIntentOutcome(intent.id, 'failed');
    return 'That action is no longer supported, so nothing was changed.';
  }

  try {
    const result = await tool.execute(intent.userId, intent.payload);
    await setIntentOutcome(intent.id, 'executed');
    await recordAudit({
      userId: intent.userId,
      actor: 'agent',
      action: 'intent.executed',
      target: intent.id,
      after: { tool: intent.tool, result },
    });
    return result;
  } catch (err) {
    console.error(`Intent ${intent.id} (${intent.tool}) failed:`, err);
    await setIntentOutcome(intent.id, 'failed');
    await recordAudit({
      userId: intent.userId,
      actor: 'agent',
      action: 'intent.failed',
      target: intent.id,
      after: { tool: intent.tool },
    });
    return 'Something went wrong while applying it, so nothing was changed.';
  }
}

export async function closeCard(api: Api, intent: Intent, text: string): Promise<void> {
  if (intent.cardMessageId === null) return;
  try {
    await api.editMessageText(Number(intent.chatId), Number(intent.cardMessageId), text);
  } catch (err) {
    console.warn(`Could not close approval card for intent ${intent.id}:`, err);
  }
}
