import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from './client.js';
import { messages } from './schema.js';

export async function recordMessage(input: {
  userId: string;
  chatId: number;
  telegramMessageId: number;
  role: 'user' | 'agent';
  content: string;
}): Promise<string> {
  const [row] = await db
    .insert(messages)
    .values({
      userId: input.userId,
      telegramChatId: BigInt(input.chatId),
      telegramMessageId: BigInt(input.telegramMessageId),
      role: input.role,
      content: input.content,
    })
    .returning({ id: messages.id });
  if (!row) throw new Error('Failed to record message');
  return row.id;
}

export async function listRecentMessages(
  userId: string,
  limit: number,
  excludeId: string,
): Promise<{ role: 'user' | 'agent'; content: string }[]> {
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        ne(messages.id, excludeId),
        inArray(messages.role, ['user', 'agent']),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows.reverse().flatMap((row) =>
    row.role === 'user' || row.role === 'agent' ? [{ role: row.role, content: row.content }] : [],
  );
}
