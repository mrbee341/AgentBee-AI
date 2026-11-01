import type { Api } from 'grammy';
import { z } from 'zod';
import { proposeIntentCard, type ProposalOutcome } from '../approvals/propose.js';
import { MAX_WORKSPACE_FILE_CHARS } from '../db/workspace.js';
import { findFactsMatching } from '../memory/facts.js';
import { sanitizeToolOutput, wrapUntrusted } from '../lib/tool-output.js';
import { listWorkspaceDir, readWorkspaceFile } from '../tools/read-tools.js';
import { fetchPage, webSearch } from '../tools/web.js';
import type { ToolSpec } from './openrouter.js';

export type ToolRunContext = {
  api: Api;
  userId: string;
  chatId: number;
  sourceMessageId: number;
};

const MEMORY_SEARCH_LIMIT = 5;
const MEMORY_OUTPUT_CHARS = 1_000;

const TOOLS = {
  web_search: {
    description: 'Search the web for quick answers. Use for current facts.',
    schema: z.object({ query: z.string().trim().min(1).max(200) }),
    sideEffect: false,
  },
  fetch_url: {
    description: 'Read the text of a public https web page.',
    schema: z.object({ url: z.string().trim().min(1).max(2000) }),
    sideEffect: false,
  },
  read_file: {
    description: 'Read a file from the user workspace by path.',
    schema: z.object({ path: z.string().trim().min(1).max(200) }),
    sideEffect: false,
  },
  list_dir: {
    description: 'List the files in the user workspace.',
    schema: z.object({}),
    sideEffect: false,
  },
  memory_search: {
    description: 'Check what is remembered about the user that matches a word or phrase.',
    schema: z.object({ query: z.string().trim().min(1).max(120) }),
    sideEffect: false,
  },
  remember: {
    description: 'Propose saving a fact to memory. The user must approve before it is saved.',
    schema: z.object({ text: z.string().trim().min(1).max(200) }),
    sideEffect: true,
  },
  forget: {
    description: 'Propose deleting remembered facts that match words. The user must approve.',
    schema: z.object({ query: z.string().trim().min(1).max(120) }),
    sideEffect: true,
  },
  write_file: {
    description: 'Propose saving a file in the user workspace. The user must approve before it is written.',
    schema: z.object({
      path: z.string().trim().min(1).max(200),
      content: z.string().max(MAX_WORKSPACE_FILE_CHARS),
    }),
    sideEffect: true,
  },
} satisfies Record<string, { description: string; schema: z.ZodObject<z.ZodRawShape>; sideEffect: boolean }>;

type ToolName = keyof typeof TOOLS;

export const MODEL_TOOLS: ToolSpec[] = (Object.keys(TOOLS) as ToolName[]).map((name) => {
  const tool = TOOLS[name];
  const properties = Object.fromEntries(Object.keys(tool.schema.shape).map((key) => [key, { type: 'string' }]));
  return {
    type: 'function',
    function: {
      name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required: Object.keys(tool.schema.shape),
        additionalProperties: false,
      },
    },
  };
});

const PROPOSAL_MESSAGES: Record<ProposalOutcome, string> = {
  sent: 'An approval card was sent to the user. Nothing has changed yet; it only happens if they approve.',
  invalid: 'That change could not be prepared because the input was not valid.',
  duplicate: 'This change was already proposed earlier in the conversation.',
};

export async function runModelTool(ctx: ToolRunContext, name: string, rawArgs: string): Promise<string> {
  if (!isToolName(name)) return `Unknown tool: ${name}`;

  let json: unknown;
  try {
    json = JSON.parse(rawArgs);
  } catch {
    return 'The tool arguments were not valid JSON.';
  }

  const tool = TOOLS[name];
  const parsed = tool.schema.safeParse(json);
  if (!parsed.success) return 'The tool arguments did not match what the tool expects.';

  if (tool.sideEffect) {
    const outcome = await proposeIntentCard({
      api: ctx.api,
      userId: ctx.userId,
      chatId: ctx.chatId,
      sourceMessageId: ctx.sourceMessageId,
      toolName: name,
      raw: parsed.data,
    });
    return PROPOSAL_MESSAGES[outcome];
  }

  try {
    return await runReadTool(ctx.userId, name, parsed.data);
  } catch (err) {
    console.error(`Model tool ${name} failed:`, err);
    return `The ${name} tool failed, so there is no result to use.`;
  }
}

async function runReadTool(userId: string, name: ToolName, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'web_search':
      return webSearch(args.query ?? '');
    case 'fetch_url':
      return fetchPage(args.url ?? '');
    case 'read_file':
      return (await readWorkspaceFile(userId, args.path ?? '')) ?? 'No file exists at that path.';
    case 'list_dir':
      return listWorkspaceDir(userId);
    case 'memory_search': {
      const matches = await findFactsMatching(userId, args.query ?? '', MEMORY_SEARCH_LIMIT);
      if (matches.length === 0) return 'Nothing remembered matches that.';
      const listing = matches.map((match) => `- ${match.value}`).join('\n');
      return wrapUntrusted('memory_search', sanitizeToolOutput(listing, MEMORY_OUTPUT_CHARS));
    }
    default:
      throw new Error(`${name} is not a read tool`);
  }
}

function isToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOLS, name);
}
