import { db } from './client.js';
import { audit } from './schema.js';

export type AuditEntry = {
  userId: string;
  actor: 'user' | 'agent' | 'system';
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
};

export async function recordAudit(entry: AuditEntry): Promise<void> {
  await db.insert(audit).values({
    userId: entry.userId,
    actor: entry.actor,
    action: entry.action,
    target: entry.target ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
