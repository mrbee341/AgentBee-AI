import type { Bot, Context } from 'grammy';
import { proposeIntentCard, type ProposalOutcome } from '../approvals/propose.js';
import { ensureUser } from '../db/users.js';
import { listWorkspaceDir, readWorkspaceFile } from '../tools/read-tools.js';
import { fetchPage, webSearch } from '../tools/web.js';

const WRITE_USAGE = 'Usage: /write <path> <contents>. Paths use letters, numbers, dots, dashes and slashes.';
const READ_USAGE = 'Usage: /read <path>';

export function registerToolHandlers(bot: Bot) {
  bot.command('remember', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    await proposeFromCommand(ctx, 'remember', { text: ctx.match }, 'Usage: /remember <something to keep in mind>');
  });

  bot.command('forget', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    await proposeFromCommand(ctx, 'forget', { query: ctx.match }, 'Usage: /forget <words from the fact>');
  });

  bot.command('write', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    const match = /^(\S+)\s+([\s\S]+)$/.exec(ctx.match.trim());
    if (!match) {
      await ctx.reply(WRITE_USAGE);
      return;
    }
    await proposeFromCommand(ctx, 'write_file', { path: match[1], content: match[2] }, WRITE_USAGE);
  });

  bot.command('read', async (ctx) => {
    if (!ctx.from || !(await requirePrivate(ctx))) return;
    const path = ctx.match.trim();
    if (!path) {
      await ctx.reply(READ_USAGE);
      return;
    }
    const userId = await ensureUser(ctx.from);
    const output = await readWorkspaceFile(userId, path);
    await ctx.reply(output ?? 'No file exists at that path.');
  });

  bot.command('ls', async (ctx) => {
    if (!ctx.from || !(await requirePrivate(ctx))) return;
    const userId = await ensureUser(ctx.from);
    await ctx.reply(await listWorkspaceDir(userId));
  });

  bot.command('search', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    const query = ctx.match.trim();
    if (!query) {
      await ctx.reply('Usage: /search <words>');
      return;
    }
    await ctx.reply(await runReadTool('search', () => webSearch(query)));
  });

  bot.command('fetch', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    const url = ctx.match.trim();
    if (!url) {
      await ctx.reply('Usage: /fetch <https address>');
      return;
    }
    await ctx.reply(await runReadTool('fetch', () => fetchPage(url)));
  });
}

async function runReadTool(label: string, run: () => Promise<string>): Promise<string> {
  try {
    return await run();
  } catch (err) {
    console.error(`${label} tool failed:`, err);
    return `That ${label} could not be completed. ${err instanceof Error ? err.message : ''}`.trim();
  }
}

async function requirePrivate(ctx: Context): Promise<boolean> {
  if (ctx.chat?.type === 'private' && ctx.from) return true;
  await ctx.reply('Message me in a private chat to use this command.');
  return false;
}

async function proposeFromCommand(ctx: Context, toolName: string, raw: unknown, usage: string): Promise<void> {
  if (!ctx.from || !ctx.chat || !ctx.message) return;
  const userId = await ensureUser(ctx.from);
  const outcome: ProposalOutcome = await proposeIntentCard({
    api: ctx.api,
    userId,
    chatId: ctx.chat.id,
    sourceMessageId: ctx.message.message_id,
    toolName,
    raw,
  });
  if (outcome === 'invalid') await ctx.reply(`Nothing to do. ${usage}`);
}
