import { and, eq } from 'drizzle-orm';
import { db } from './client.js';
import { workspaceFiles } from './schema.js';

export const MAX_WORKSPACE_FILE_CHARS = 20_000;

export async function upsertWorkspaceFile(userId: string, path: string, content: string): Promise<void> {
  await db
    .insert(workspaceFiles)
    .values({ userId, path, content, sizeBytes: Buffer.byteLength(content, 'utf8') })
    .onConflictDoUpdate({
      target: [workspaceFiles.userId, workspaceFiles.path],
      set: {
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date(),
      },
    });
}

export async function getWorkspaceFile(userId: string, path: string): Promise<string | null> {
  const [row] = await db
    .select({ content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.path, path)))
    .limit(1);
  return row?.content ?? null;
}

export async function listWorkspacePaths(userId: string): Promise<{ path: string; sizeBytes: number }[]> {
  return db
    .select({ path: workspaceFiles.path, sizeBytes: workspaceFiles.sizeBytes })
    .from(workspaceFiles)
    .where(eq(workspaceFiles.userId, userId))
    .orderBy(workspaceFiles.path)
    .limit(100);
}
