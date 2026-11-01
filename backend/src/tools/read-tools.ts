import { getWorkspaceFile, listWorkspacePaths } from '../db/workspace.js';
import { sanitizeToolOutput, wrapUntrusted } from '../lib/tool-output.js';
import { normalizeWorkspacePath } from './paths.js';

const READ_MAX_CHARS = 3_000;

export async function readWorkspaceFile(userId: string, rawPath: string): Promise<string | null> {
  const path = normalizeWorkspacePath(rawPath);
  if (!path) return null;
  const content = await getWorkspaceFile(userId, path);
  if (content === null) return null;
  return wrapUntrusted('read_file', sanitizeToolOutput(content, READ_MAX_CHARS));
}

export async function listWorkspaceDir(userId: string): Promise<string> {
  const entries = await listWorkspacePaths(userId);
  if (entries.length === 0) return 'The workspace is empty.';
  const listing = entries.map((entry) => `${entry.path} (${entry.sizeBytes} bytes)`).join('\n');
  return wrapUntrusted('list_dir', sanitizeToolOutput(listing, READ_MAX_CHARS));
}
