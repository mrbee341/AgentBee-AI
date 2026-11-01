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
