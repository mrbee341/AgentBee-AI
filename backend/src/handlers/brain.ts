import { InlineKeyboard, type Bot, type Context } from 'grammy';
import { ensureUser } from '../db/users.js';
import { FACTS_PAGE_SIZE, correctFact, deleteFact, getFact, listFacts } from '../memory/facts.js';
import { showScreen, type Screen } from '../lib/screen.js';
import { truncate } from '../lib/text.js';

const CORRECTION_PROMPT = /^Editing "([^"]+)"/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CORRECTION_LENGTH = 200;

export function registerBrainHandlers(bot: Bot) {
  bot.command('brain', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type !== 'private') {
      await ctx.reply('Message me in a private chat to review your memory.');
      return;
    }
    const userId = await ensureUser(ctx.from);
    const screen = await listScreen(userId, 0);
    await ctx.reply(screen.text, { reply_markup: screen.keyboard });
  });

  bot.callbackQuery(/^brain:/, async (ctx) => {
    if (!ctx.from) return;
    const [, action = '', arg = ''] = ctx.callbackQuery.data.split(':');
    const userId = await ensureUser(ctx.from);
    await ctx.answerCallbackQuery();

    if (action === 'list') {
      await showScreen(ctx, await listScreen(userId, Number(arg) || 0));
      return;
    }

    const fact = UUID_PATTERN.test(arg) ? await getFact(userId, arg) : null;
    if (!fact) {
      await showScreen(ctx, await listScreen(userId, 0));
      await ctx.reply('That fact no longer exists.');
      return;
    }

    switch (action) {
      case 'view':
        await showScreen(ctx, factScreen(fact));
        return;
      case 'del':
        await showScreen(ctx, deleteConfirmScreen(fact.id, fact.value));
        return;
      case 'delok':
        await deleteFact(userId, fact.id);
        await showScreen(ctx, await listScreen(userId, 0));
        return;
      case 'edit':
        await ctx.reply(`Editing "${fact.key}". Reply to this message with the corrected wording.`, {
          reply_markup: { force_reply: true, input_field_placeholder: truncate(fact.value, 60) },
        });
        return;
    }
  });
}

export async function handleCorrectionReply(ctx: Context): Promise<boolean> {
  const replied = ctx.message?.reply_to_message;
  const text = ctx.message?.text;
  if (!ctx.from || text === undefined || !replied?.from?.is_bot) return false;

  const match = CORRECTION_PROMPT.exec(replied.text ?? '');
  const key = match?.[1];
  if (!key) return false;

  const value = text.trim().slice(0, MAX_CORRECTION_LENGTH);
  if (!value) {
    await ctx.reply('The correction was empty, so nothing changed.');
    return true;
  }

  const userId = await ensureUser(ctx.from);
  const updated = await correctFact(userId, key, value);
  await ctx.reply(
    updated
      ? 'Updated. This fact is now pinned, so automatic learning will not overwrite it.'
      : 'That fact no longer exists.',
  );
  return true;
}

async function listScreen(userId: string, requestedPage: number): Promise<Screen> {
  const { rows, total, page, pageCount } = await listFacts(userId, requestedPage);
  const keyboard = new InlineKeyboard();

  if (total === 0) {
    return {
      text: 'Nothing remembered yet.\n\nTell me something about yourself, such as "I\'m allergic to shellfish", and it will show up here.',
      keyboard,
    };
  }

  rows.forEach((row, index) => {
    const number = page * FACTS_PAGE_SIZE + index + 1;
    keyboard.text(truncate(`${number}. ${row.value}`, 44), `brain:view:${row.id}`).row();
  });

  if (pageCount > 1) {
    if (page > 0) keyboard.text('Previous', `brain:list:${page - 1}`);
    keyboard.text(`Page ${page + 1} of ${pageCount}`, `brain:list:${page}`);
    if (page < pageCount - 1) keyboard.text('Next', `brain:list:${page + 1}`);
  }

  return {
    text: `Memory: ${total} ${total === 1 ? 'fact' : 'facts'}\n\nThese are the facts I keep about you. Tap one to inspect, correct or delete it.`,
    keyboard,
  };
}

function factScreen(fact: {
  id: string;
  key: string;
  value: string;
  confidence: number;
  pinned: boolean;
  createdAt: Date;
  sourceText: string | null;
}): Screen {
  const source = fact.sourceText
    ? `"${truncate(fact.sourceText, 160)}"`
    : 'The message it came from has been removed.';
  const text = [
    fact.value,
    '',
    `Key: ${fact.key}`,
    `Confidence: ${Math.round(fact.confidence * 100)}%`,
    `Pinned: ${fact.pinned ? 'yes, you corrected it' : 'no, learned automatically'}`,
    `Learned: ${fact.createdAt.toISOString().slice(0, 10)}`,
    `Source: ${source}`,
  ].join('\n');

  const keyboard = new InlineKeyboard()
    .text('Correct', `brain:edit:${fact.id}`)
    .text('Delete', `brain:del:${fact.id}`)
    .row()
    .text('Back to list', 'brain:list:0');

  return { text, keyboard };
}

function deleteConfirmScreen(factId: string, value: string): Screen {
  return {
    text: `Delete this fact?\n\n${value}\n\nIt is removed from memory immediately and cannot be recovered.`,
    keyboard: new InlineKeyboard()
      .text('Yes, delete', `brain:delok:${factId}`)
      .text('Cancel', `brain:view:${factId}`),
  };
}
