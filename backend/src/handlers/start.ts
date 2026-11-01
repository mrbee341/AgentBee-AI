import type { Bot } from 'grammy';
import { ensureUser } from '../db/users.js';
import { recordMessage } from '../db/messages.js';

const WELCOME_TEXT = [
  'Welcome to AgentBee. I research, write and run code, and handle on-chain actions, and I show every step.',
  '',
  'Tell me something lasting about yourself, such as "I\'m allergic to shellfish", and I will remember it.',
  '',
  '/brain - review and correct what I remember',
  '/skills - browse and install skills',
].join('\n');

export function registerStartHandler(bot: Bot) {
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id;
    const incomingMessageId = ctx.message?.message_id;
    if (!ctx.from || chatId === undefined || incomingMessageId === undefined) return;

    const userId = await ensureUser(ctx.from);
    await recordMessage({
      userId,
      chatId,
      telegramMessageId: incomingMessageId,
      role: 'user',
      content: '/start',
    });

    const reply = await ctx.reply(WELCOME_TEXT);
    await recordMessage({
      userId,
      chatId,
      telegramMessageId: reply.message_id,
      role: 'agent',
      content: WELCOME_TEXT,
    });
  });
}
