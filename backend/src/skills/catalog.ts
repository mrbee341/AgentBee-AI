import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { skills, userSkills, type Skill } from '../db/schema.js';

export type CatalogEntry = {
  skill: Skill;
  enabled: boolean | null;
};

export async function listCatalog(userId: string): Promise<CatalogEntry[]> {
  return db
    .select({ skill: skills, enabled: userSkills.enabled })
    .from(skills)
    .leftJoin(userSkills, and(eq(userSkills.skillId, skills.id), eq(userSkills.userId, userId)))
    .where(eq(skills.isPublic, true))
    .orderBy(asc(skills.slug));
}

export async function findPublicSkill(slug: string): Promise<Skill | null> {
  const [row] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.slug, slug), eq(skills.isPublic, true)))
    .limit(1);
  return row ?? null;
}

export async function installSkill(userId: string, skillId: string): Promise<void> {
  const inserted = await db
    .insert(userSkills)
    .values({ userId, skillId })
    .onConflictDoNothing()
    .returning({ id: userSkills.id });

  if (inserted.length === 0) {
    await setSkillEnabled(userId, skillId, true);
    return;
  }

  await db
    .update(skills)
    .set({ installs: sql`${skills.installs} + 1` })
    .where(eq(skills.id, skillId));
}

export async function setSkillEnabled(userId: string, skillId: string, enabled: boolean): Promise<void> {
  await db
    .update(userSkills)
    .set({ enabled })
    .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)));
}
