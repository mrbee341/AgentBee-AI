import { Bot } from 'grammy';
import { sql } from 'drizzle-orm';
import { config } from './config.js';
import { db } from './db/client.js';
import { messages, users } from './db/schema.js';

export const bot = new Bot(config.BOT_TOKEN);

bot.command('start', async (ctx) => {
  const from = ctx.from;
  const chatId = ctx.chat?.id;
  const incomingMessageId = ctx.message?.message_id;
  if (!from || chatId === undefined || incomingMessageId === undefined) return;

  const [user] = await db
    .insert(users)
    .values({
      telegramId: BigInt(from.id),
      username: from.username ?? null,
      firstName: from.first_name,
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        username: from.username ?? null,
        firstName: from.first_name,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: users.id });
  if (!user) throw new Error(`Failed to upsert user ${from.id}`);

  await db.insert(messages).values({
    userId: user.id,
    telegramChatId: BigInt(chatId),
    telegramMessageId: BigInt(incomingMessageId),
    role: 'user',
    content: '/start',
  });

  const replyText = `AgentBee connected. User ID: ${from.id}`;
  const reply = await ctx.reply(replyText);

  await db.insert(messages).values({
    userId: user.id,
    telegramChatId: BigInt(chatId),
    telegramMessageId: BigInt(reply.message_id),
    role: 'agent',
    content: replyText,
  });
});

bot.catch((err) => {
  console.error('Bot error while handling update:', err.error);
});
