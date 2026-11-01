import type { Bot } from 'grammy';
import { ensureUser } from '../db/users.js';
import { recordMessage } from '../db/messages.js';
import { extractFacts } from '../memory/extract.js';
import { upsertExtractedFacts } from '../memory/facts.js';
import { handleCorrectionReply } from './brain.js';
import { handleApprovalReply } from './approvals.js';
import { runAgentTurn } from '../ai/orchestrator.js';

export function registerTextHandler(bot: Bot) {
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!ctx.from || chatId === undefined || ctx.chat?.type !== 'private') return;

    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    if (await handleCorrectionReply(ctx)) return;
    if (await handleApprovalReply(ctx)) return;

    const userId = await ensureUser(ctx.from);
    const messageId = await recordMessage({
      userId,
      chatId,
      telegramMessageId: ctx.message.message_id,
      role: 'user',
      content: text,
    });

    const candidates = extractFacts(text);
    if (candidates.length > 0) {
      void upsertExtractedFacts(userId, messageId, candidates).catch((err: unknown) => {
        console.error('Fact distillation failed:', err);
      });
    }

    void runAgentTurn({
      api: ctx.api,
      userId,
      chatId,
      sourceMessageId: ctx.message.message_id,
      currentMessageId: messageId,
      text,
    });
  });
}
