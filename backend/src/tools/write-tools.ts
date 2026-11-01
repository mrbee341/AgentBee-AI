import { createHash } from 'node:crypto';
import { z } from 'zod';
import { saveRememberedFact, findFactsMatching, deleteFacts } from '../memory/facts.js';
import { upsertWorkspaceFile, MAX_WORKSPACE_FILE_CHARS } from '../db/workspace.js';
import { truncate } from '../lib/text.js';
import { normalizeWorkspacePath } from './paths.js';

export type Proposal = {
  preview: string;
  payload: Record<string, unknown>;
};

export type WriteTool = {
  name: string;
  title: string;
  editField?: string;
  editPrompt?: string;
  propose(userId: string, raw: unknown): Promise<Proposal | null>;
  execute(userId: string, payload: unknown): Promise<string>;
};

const MAX_FORGET_MATCHES = 5;

const rememberSchema = z.object({ text: z.string().trim().min(1).max(200) });
const forgetSchema = z.object({ query: z.string().trim().min(1).max(120) });
const forgetPayloadSchema = z.object({ factIds: z.array(z.string().uuid()).min(1).max(MAX_FORGET_MATCHES) });
const writeFileSchema = z.object({
  path: z.string().max(200),
  content: z.string().max(MAX_WORKSPACE_FILE_CHARS),
});

const remember: WriteTool = {
  name: 'remember',
  title: 'Remember this',
  editField: 'text',
  editPrompt: 'Reply with the new wording to remember.',
  async propose(_userId, raw) {
    const parsed = rememberSchema.safeParse(raw);
    if (!parsed.success) return null;
    return {
      preview: `"${parsed.data.text}"`,
      payload: { text: parsed.data.text },
    };
  },
  async execute(userId, payload) {
    const { text } = rememberSchema.parse(payload);
    await saveRememberedFact(userId, `note:${slugify(text)}`, text);
    return 'Saved to memory.';
  },
};

const forget: WriteTool = {
  name: 'forget',
  title: 'Forget these facts',
  async propose(userId, raw) {
    const parsed = forgetSchema.safeParse(raw);
    if (!parsed.success) return null;
    const matches = await findFactsMatching(userId, parsed.data.query, MAX_FORGET_MATCHES);
    if (matches.length === 0) return null;
    const lines = matches.map((match, index) => `${index + 1}. ${truncate(match.value, 80)}`);
    return {
      preview: lines.join('\n'),
      payload: { factIds: matches.map((match) => match.id) },
    };
  },
  async execute(userId, payload) {
    const { factIds } = forgetPayloadSchema.parse(payload);
    const removed = await deleteFacts(userId, factIds);
    return `Forgot ${removed} ${removed === 1 ? 'fact' : 'facts'}.`;
  },
};

const writeFile: WriteTool = {
  name: 'write_file',
  title: 'Save file',
  editField: 'content',
  editPrompt: 'Reply with the new file contents.',
  async propose(_userId, raw) {
    const parsed = writeFileSchema.safeParse(raw);
    if (!parsed.success) return null;
    const path = normalizeWorkspacePath(parsed.data.path);
    if (!path) return null;
    const bytes = Buffer.byteLength(parsed.data.content, 'utf8');
    return {
      preview: `${path} (${bytes} bytes)\n\n${truncate(parsed.data.content, 300)}`,
      payload: { path, content: parsed.data.content },
    };
  },
  async execute(userId, payload) {
    const parsed = writeFileSchema.parse(payload);
    const path = normalizeWorkspacePath(parsed.path);
    if (!path) throw new Error('Invalid workspace path in stored intent');
    await upsertWorkspaceFile(userId, path, parsed.content);
    return `Saved ${path}.`;
  },
};

export const WRITE_TOOLS: Record<string, WriteTool> = {
  [remember.name]: remember,
  [forget.name]: forget,
  [writeFile.name]: writeFile,
};

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || createHash('sha256').update(text).digest('hex').slice(0, 16);
}
