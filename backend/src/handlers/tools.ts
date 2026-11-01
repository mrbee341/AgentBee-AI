import type { Bot, Context } from 'grammy';
import { recordAudit } from '../db/audit.js';
import { ensureUser } from '../db/users.js';
import { approvalScreen } from '../approvals/card.js';
import { createIntent, issueToken, setIntentCardMessage } from '../approvals/ledger.js';
import { WRITE_TOOLS } from '../tools/write-tools.js';
import { listWorkspaceDir, readWorkspaceFile } from '../tools/read-tools.js';

const WRITE_USAGE = 'Usage: /write <path> <contents>. Paths use letters, numbers, dots, dashes and slashes.';
const READ_USAGE = 'Usage: /read <path>';

export function registerToolHandlers(bot: Bot) {
  bot.command('remember', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    await proposeAndSend(ctx, 'remember', { text: ctx.match }, 'Usage: /remember <something to keep in mind>');
  });

  bot.command('forget', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    await proposeAndSend(ctx, 'forget', { query: ctx.match }, 'Usage: /forget <words from the fact>');
  });

  bot.command('write', async (ctx) => {
    if (!(await requirePrivate(ctx))) return;
    const match = /^(\S+)\s+([\s\S]+)$/.exec(ctx.match.trim());
    if (!match) {
      await ctx.reply(WRITE_USAGE);
      return;
    }
    await proposeAndSend(ctx, 'write_file', { path: match[1], content: match[2] }, WRITE_USAGE);
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
}

async function requirePrivate(ctx: Context): Promise<boolean> {
  if (ctx.chat?.type === 'private' && ctx.from) return true;
  await ctx.reply('Message me in a private chat to use this command.');
  return false;
}

async function proposeAndSend(ctx: Context, toolName: string, raw: unknown, usage: string): Promise<void> {
  if (!ctx.from || !ctx.chat || !ctx.message) return;
  const tool = WRITE_TOOLS[toolName];
  if (!tool) return;

  const userId = await ensureUser(ctx.from);
  const proposal = await tool.propose(userId, raw);
  if (!proposal) {
    await ctx.reply(`Nothing to do. ${usage}`);
    return;
  }

  const { token } = issueToken();
  const chatId = ctx.chat.id;
  const intent = await createIntent({
    userId,
    chatId,
    tool: toolName,
    payload: proposal.payload,
    preview: proposal.preview,
    idemKey: `${chatId}:${ctx.message.message_id}:${toolName}`,
    token,
  });
  if (!intent) return;

  await recordAudit({
    userId,
    actor: 'agent',
    action: 'intent.created',
    target: intent.id,
    after: { tool: toolName, preview: proposal.preview },
  });

  const screen = approvalScreen({
    title: tool.title,
    preview: proposal.preview,
    token,
    editable: tool.editField !== undefined,
  });
  const card = await ctx.reply(screen.text, { reply_markup: screen.keyboard });
  await setIntentCardMessage(intent.id, card.message_id);
}
