import { createHash } from 'node:crypto';
import type { Api } from 'grammy';
import { recordAudit } from '../db/audit.js';
import { WRITE_TOOLS } from '../tools/write-tools.js';
import { approvalScreen } from './card.js';
import { createIntent, issueToken, setIntentCardMessage } from './ledger.js';

export type ProposalOutcome = 'sent' | 'invalid' | 'duplicate';

export async function proposeIntentCard(input: {
  api: Api;
  userId: string;
  chatId: number;
  sourceMessageId: number;
  toolName: string;
  raw: unknown;
}): Promise<ProposalOutcome> {
  const tool = WRITE_TOOLS[input.toolName];
  if (!tool) return 'invalid';

  const proposal = await tool.propose(input.userId, input.raw);
  if (!proposal) return 'invalid';

  const argsDigest = createHash('sha256').update(JSON.stringify(input.raw)).digest('hex').slice(0, 16);
  const { token } = issueToken();
  const intent = await createIntent({
    userId: input.userId,
    chatId: input.chatId,
    tool: input.toolName,
    payload: proposal.payload,
    preview: proposal.preview,
    idemKey: `${input.chatId}:${input.sourceMessageId}:${input.toolName}:${argsDigest}`,
    token,
  });
  if (!intent) return 'duplicate';

  await recordAudit({
    userId: input.userId,
    actor: 'agent',
    action: 'intent.created',
    target: intent.id,
    after: { tool: input.toolName, preview: proposal.preview },
  });

  const screen = approvalScreen({
    title: tool.title,
    preview: proposal.preview,
    token,
    editable: tool.editField !== undefined,
  });
  const card = await input.api.sendMessage(input.chatId, screen.text, { reply_markup: screen.keyboard });
  await setIntentCardMessage(intent.id, card.message_id);
  return 'sent';
}
