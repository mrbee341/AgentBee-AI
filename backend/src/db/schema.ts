import { sql } from 'drizzle-orm';
import { bigint, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const messageRole = pgEnum('message_role', ['user', 'agent', 'system']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull().unique(),
  username: text('username'),
  firstName: text('first_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    telegramChatId: bigint('telegram_chat_id', { mode: 'bigint' }).notNull(),
    telegramMessageId: bigint('telegram_message_id', { mode: 'bigint' }).notNull(),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_user_id_created_at_idx').on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
