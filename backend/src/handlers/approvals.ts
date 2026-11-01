import type { Bot, Context } from 'grammy';
import { recordAudit } from '../db/audit.js';
import { ensureUser } from '../db/users.js';
import { approvalScreen } from '../approvals/card.js';
import {
  claimIntentById,
  claimIntentByToken,
  findActiveIntentById,
  findActiveIntentByToken,
  findLatestActiveIntent,
  issueToken,
  replaceIntentProposal,
  setIntentCardMessage,
} from '../approvals/ledger.js';
import { closeCard, settleIntent } from '../approvals/resolve.js';
import { WRITE_TOOLS } from '../tools/write-tools.js';

const EDIT_PROMPT = /^Editing approval ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i;
const YES_WORDS = new Set(['yes', 'y']);
const NO_WORDS = new Set(['no', 'n']);
const EXPIRED_MESSAGE = 'This approval has expired or was already answered.';

export function registerApprovalHandlers(bot: Bot) {
  bot.callbackQuery(/^ap:/, async (ctx) => {
    if (!ctx.from) return;
    const [, op = '', token = ''] = ctx.callbackQuery.data.split(':');
    const userId = await ensureUser(ctx.from);

    if (op === 'e') {
      await startEdit(ctx, userId, token);
      return;
    }

    const decision = op === 'y' ? 'approved' : op === 'n' ? 'rejected' : null;
    if (!decision || !token) {
      await ctx.answerCallbackQuery({ text: 'That button is no longer valid.', show_alert: true });
      return;
    }

    const intent = await claimIntentByToken(userId, token, decision);
    if (!intent) {
      await ctx.answerCallbackQuery({ text: EXPIRED_MESSAGE, show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(await settleIntent(intent, decision));
  });
}

export async function handleApprovalReply(ctx: Context): Promise<boolean> {
  const text = ctx.message?.text?.trim();
  if (!ctx.from || text === undefined) return false;

  const replied = ctx.message?.reply_to_message;
  const editMatch = replied?.from?.is_bot ? EDIT_PROMPT.exec(replied.text ?? '') : null;
  if (editMatch?.[1]) {
    const userId = await ensureUser(ctx.from);
    await applyEdit(ctx, userId, editMatch[1], text);
    return true;
  }

  const word = text.toLowerCase();
  const isYes = YES_WORDS.has(word);
  if (!isYes && !NO_WORDS.has(word)) return false;

  const userId = await ensureUser(ctx.from);
  const latest = await findLatestActiveIntent(userId);
  if (!latest) return false;

  const decision = isYes ? 'approved' : 'rejected';
  const intent = await claimIntentById(userId, latest.id, decision);
  if (!intent) {
    await ctx.reply(EXPIRED_MESSAGE);
    return true;
  }

  const outcome = await settleIntent(intent, decision);
  await closeCard(ctx.api, intent, outcome);
  await ctx.reply(outcome);
  return true;
}

async function startEdit(ctx: Context, userId: string, token: string): Promise<void> {
  const intent = await findActiveIntentByToken(userId, token);
  if (!intent) {
    await ctx.answerCallbackQuery({ text: EXPIRED_MESSAGE, show_alert: true });
    return;
  }

  const tool = WRITE_TOOLS[intent.tool];
  if (!tool?.editPrompt) {
    await ctx.answerCallbackQuery({ text: 'This approval cannot be edited.', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.reply(`Editing approval ${intent.id}. ${tool.editPrompt}`, {
    reply_markup: { force_reply: true, input_field_placeholder: tool.title },
  });
}

async function applyEdit(ctx: Context, userId: string, intentId: string, newText: string): Promise<void> {
  if (!newText) {
    await ctx.reply('The edit was empty, so nothing changed.');
    return;
  }

  const intent = await findActiveIntentById(userId, intentId);
  const tool = intent ? WRITE_TOOLS[intent.tool] : undefined;
  if (!intent || !tool?.editField) {
    await ctx.reply(EXPIRED_MESSAGE);
    return;
  }

  const proposal = await tool.propose(userId, { ...intent.payload, [tool.editField]: newText });
  if (!proposal) {
    await ctx.reply('That change could not be prepared, so nothing changed.');
    return;
  }

  const { token } = issueToken();
  const updated = await replaceIntentProposal({
    userId,
    intentId: intent.id,
    payload: proposal.payload,
    preview: proposal.preview,
    token,
  });
  if (!updated) {
    await ctx.reply(EXPIRED_MESSAGE);
    return;
  }

  await recordAudit({
    userId,
    actor: 'user',
    action: 'intent.edited',
    target: intent.id,
    before: { preview: intent.preview },
    after: { preview: proposal.preview },
  });

  const screen = approvalScreen({
    title: tool.title,
    preview: proposal.preview,
    token,
    editable: true,
  });

  if (updated.cardMessageId !== null) {
    try {
      await ctx.api.editMessageText(Number(updated.chatId), Number(updated.cardMessageId), screen.text, {
        reply_markup: screen.keyboard,
      });
      return;
    } catch (err) {
      console.warn(`Could not update approval card for intent ${updated.id}, sending a new one:`, err);
    }
  }

  const card = await ctx.reply(screen.text, { reply_markup: screen.keyboard });
  await setIntentCardMessage(updated.id, card.message_id);
}
