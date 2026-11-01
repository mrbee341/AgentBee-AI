import { and, desc, eq, gt, lte, sql, type SQL } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '../db/client.js';
import { intents, type Intent } from '../db/schema.js';

export const APPROVAL_TTL_SECONDS = 5 * 60;

export function issueToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createIntent(input: {
  userId: string;
  chatId: number;
  tool: string;
  payload: Record<string, unknown>;
  preview: string;
  idemKey: string;
  token: string;
}): Promise<Intent | null> {
  await expireStaleIntents(input.userId);
  const [row] = await db
    .insert(intents)
    .values({
      userId: input.userId,
      tool: input.tool,
      payload: input.payload,
      preview: input.preview,
      token: hashToken(input.token),
      expiresAt: sql`now() + make_interval(secs => ${APPROVAL_TTL_SECONDS})`,
      idemKey: input.idemKey,
      chatId: BigInt(input.chatId),
    })
    .onConflictDoNothing({ target: intents.idemKey })
    .returning();
  return row ?? null;
}

async function expireStaleIntents(userId: string): Promise<void> {
  await db
    .update(intents)
    .set({ status: 'expired', resolvedAt: new Date() })
    .where(
      and(
        eq(intents.userId, userId),
        eq(intents.status, 'pending'),
        lte(intents.expiresAt, sql`now()`),
      ),
    );
}

export async function findActiveIntentByToken(userId: string, token: string): Promise<Intent | null> {
  const [row] = await db
    .select()
    .from(intents)
    .where(and(eq(intents.userId, userId), eq(intents.token, hashToken(token)), activeCondition()))
    .limit(1);
  return row ?? null;
}

export async function findLatestActiveIntent(userId: string): Promise<Intent | null> {
  const [row] = await db
    .select()
    .from(intents)
    .where(and(eq(intents.userId, userId), activeCondition()))
    .orderBy(desc(intents.createdAt))
    .limit(1);
  return row ?? null;
}

export async function findActiveIntentById(userId: string, intentId: string): Promise<Intent | null> {
  const [row] = await db
    .select()
    .from(intents)
    .where(and(eq(intents.userId, userId), eq(intents.id, intentId), activeCondition()))
    .limit(1);
  return row ?? null;
}

export async function claimIntentByToken(
  userId: string,
  token: string,
  status: 'approved' | 'rejected',
): Promise<Intent | null> {
  return claim(and(eq(intents.userId, userId), eq(intents.token, hashToken(token))), status);
}

export async function claimIntentById(
  userId: string,
  intentId: string,
  status: 'approved' | 'rejected',
): Promise<Intent | null> {
  return claim(and(eq(intents.userId, userId), eq(intents.id, intentId)), status);
}

export async function replaceIntentProposal(input: {
  userId: string;
  intentId: string;
  payload: Record<string, unknown>;
  preview: string;
  token: string;
}): Promise<Intent | null> {
  const [row] = await db
    .update(intents)
    .set({ payload: input.payload, preview: input.preview, token: hashToken(input.token) })
    .where(and(eq(intents.userId, input.userId), eq(intents.id, input.intentId), activeCondition()))
    .returning();
  return row ?? null;
}

export async function setIntentCardMessage(intentId: string, messageId: number): Promise<void> {
  await db
    .update(intents)
    .set({ cardMessageId: BigInt(messageId) })
    .where(eq(intents.id, intentId));
}

export async function setIntentOutcome(intentId: string, status: 'executed' | 'failed'): Promise<void> {
  await db.update(intents).set({ status, resolvedAt: new Date() }).where(eq(intents.id, intentId));
}

async function claim(where: SQL | undefined, status: 'approved' | 'rejected'): Promise<Intent | null> {
  const [row] = await db
    .update(intents)
    .set({ status, resolvedAt: new Date() })
    .where(and(where, activeCondition()))
    .returning();
  return row ?? null;
}

function activeCondition(): SQL {
  return and(eq(intents.status, 'pending'), gt(intents.expiresAt, sql`now()`)) as SQL;
}
