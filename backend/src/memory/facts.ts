import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { facts, messages } from '../db/schema.js';
import type { FactCandidate } from './extract.js';

export const FACTS_PAGE_SIZE = 5;

export async function upsertExtractedFacts(
  userId: string,
  sourceMsgId: string,
  candidates: FactCandidate[],
): Promise<void> {
  if (candidates.length === 0) return;
  await db
    .insert(facts)
    .values(
      candidates.map((candidate) => ({
        userId,
        key: candidate.key,
        value: candidate.value,
        sourceMsg: sourceMsgId,
        confidence: candidate.confidence,
      })),
    )
    .onConflictDoUpdate({
      target: [facts.userId, facts.key],
      set: {
        value: sql`excluded.value`,
        sourceMsg: sql`excluded.source_msg`,
        confidence: sql`excluded.confidence`,
      },
      setWhere: eq(facts.pinned, false),
    });
}

export async function listFacts(userId: string, requestedPage: number) {
  const [countRow] = await db
    .select({ total: count() })
    .from(facts)
    .where(eq(facts.userId, userId));
  const total = Number(countRow?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / FACTS_PAGE_SIZE));
  const page = Math.min(Math.max(0, requestedPage), pageCount - 1);

  const rows = await db
    .select({ id: facts.id, key: facts.key, value: facts.value })
    .from(facts)
    .where(eq(facts.userId, userId))
    .orderBy(desc(facts.createdAt), desc(facts.id))
    .limit(FACTS_PAGE_SIZE)
    .offset(page * FACTS_PAGE_SIZE);

  return { rows, total, page, pageCount };
}

export async function getFact(userId: string, factId: string) {
  const [row] = await db
    .select({
      id: facts.id,
      key: facts.key,
      value: facts.value,
      confidence: facts.confidence,
      pinned: facts.pinned,
      createdAt: facts.createdAt,
      sourceText: messages.content,
    })
    .from(facts)
    .leftJoin(messages, eq(facts.sourceMsg, messages.id))
    .where(and(eq(facts.id, factId), eq(facts.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function correctFact(userId: string, key: string, value: string): Promise<boolean> {
  const updated = await db
    .update(facts)
    .set({ value, pinned: true, confidence: 1 })
    .where(and(eq(facts.key, key), eq(facts.userId, userId)))
    .returning({ id: facts.id });
  return updated.length > 0;
}

export async function listPinnedFacts(userId: string, limit: number) {
  return db
    .select({ id: facts.id, value: facts.value })
    .from(facts)
    .where(and(eq(facts.userId, userId), eq(facts.pinned, true)))
    .orderBy(desc(facts.createdAt))
    .limit(limit);
}

export async function saveRememberedFact(userId: string, key: string, value: string): Promise<void> {
  await db
    .insert(facts)
    .values({ userId, key, value, confidence: 1, pinned: true })
    .onConflictDoUpdate({
      target: [facts.userId, facts.key],
      set: { value, confidence: 1, pinned: true },
    });
}

export async function findFactsMatching(userId: string, query: string, limit: number) {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  return db
    .select({ id: facts.id, value: facts.value })
    .from(facts)
    .where(and(eq(facts.userId, userId), sql`${facts.value} ILIKE ${`%${escaped}%`}`))
    .orderBy(desc(facts.createdAt))
    .limit(limit);
}

export async function deleteFacts(userId: string, factIds: string[]): Promise<number> {
  if (factIds.length === 0) return 0;
  const deleted = await db
    .delete(facts)
    .where(and(eq(facts.userId, userId), inArray(facts.id, factIds)))
    .returning({ id: facts.id });
  return deleted.length;
}

export async function deleteFact(userId: string, factId: string): Promise<boolean> {
  const deleted = await db
    .delete(facts)
    .where(and(eq(facts.id, factId), eq(facts.userId, userId)))
    .returning({ id: facts.id });
  return deleted.length > 0;
}
