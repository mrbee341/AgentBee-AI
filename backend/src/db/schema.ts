import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const messageRole = pgEnum('message_role', ['user', 'agent', 'system']);

export const intentStatus = pgEnum('intent_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
  'executed',
  'failed',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull().unique('users_telegram_id_key'),
  username: text('username'),
  firstName: text('first_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    telegramChatId: bigint('telegram_chat_id', { mode: 'bigint' }).notNull(),
    telegramMessageId: bigint('telegram_message_id', { mode: 'bigint' }).notNull(),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_user_id_created_at_idx').on(table.userId, table.createdAt),
    foreignKey({
      name: 'messages_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
  ],
);

export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    sourceMsg: uuid('source_msg'),
    confidence: doublePrecision('confidence').notNull().default(1),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('facts_user_id_key_unique').on(table.userId, table.key),
    index('facts_user_id_created_at_idx').on(table.userId, table.createdAt),
    foreignKey({
      name: 'facts_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'facts_source_msg_fkey',
      columns: [table.sourceMsg],
      foreignColumns: [messages.id],
    }).onDelete('set null'),
  ],
);

export type SkillManifest = {
  egress: string[];
  secrets: string[];
  schedule: string | null;
};

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique('skills_slug_key'),
  version: text('version').notNull(),
  description: text('description').notNull(),
  manifest: jsonb('manifest').$type<SkillManifest>().notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  installs: integer('installs').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userSkills = pgTable(
  'user_skills',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    skillId: uuid('skill_id').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    enabled: boolean('enabled').notNull().default(true),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('user_skills_user_id_skill_id_unique').on(table.userId, table.skillId),
    foreignKey({
      name: 'user_skills_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'user_skills_skill_id_fkey',
      columns: [table.skillId],
      foreignColumns: [skills.id],
    }).onDelete('cascade'),
  ],
);

export const intents = pgTable(
  'intents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    tool: text('tool').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    preview: text('preview').notNull(),
    status: intentStatus('status').notNull().default('pending'),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    idemKey: text('idem_key').notNull(),
    chatId: bigint('chat_id', { mode: 'bigint' }).notNull(),
    cardMessageId: bigint('card_message_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    unique('intents_token_unique').on(table.token),
    unique('intents_idem_key_unique').on(table.idemKey),
    index('intents_user_id_status_created_at_idx').on(table.userId, table.status, table.createdAt),
    foreignKey({
      name: 'intents_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
  ],
);

export const audit = pgTable(
  'audit',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    target: text('target'),
    before: jsonb('before'),
    after: jsonb('after'),
    txHash: text('tx_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_user_id_created_at_idx').on(table.userId, table.createdAt),
    foreignKey({
      name: 'audit_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
  ],
);

export const workspaceFiles = pgTable(
  'workspace_files',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    path: text('path').notNull(),
    content: text('content').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('workspace_files_user_id_path_unique').on(table.userId, table.path),
    foreignKey({
      name: 'workspace_files_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Fact = typeof facts.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type UserSkill = typeof userSkills.$inferSelect;
export type Intent = typeof intents.$inferSelect;
