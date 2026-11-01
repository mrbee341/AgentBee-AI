import type { User as TelegramUser } from 'grammy/types';
import { sql } from 'drizzle-orm';
import { db } from './client.js';
import { users } from './schema.js';

export async function ensureUser(from: TelegramUser): Promise<string> {
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
  return user.id;
}
