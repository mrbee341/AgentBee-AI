import { InlineKeyboard, type Bot } from 'grammy';
import { ensureUser } from '../db/users.js';
import type { SkillManifest } from '../db/schema.js';
import { showScreen, type Screen } from '../lib/screen.js';
import { truncate } from '../lib/text.js';
import {
  findPublicSkill,
  installSkill,
  listCatalog,
  setSkillEnabled,
  type CatalogEntry,
} from '../skills/catalog.js';

export function registerSkillHandlers(bot: Bot) {
  bot.command('skills', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type !== 'private') {
      await ctx.reply('Message me in a private chat to manage skills.');
      return;
    }
    const userId = await ensureUser(ctx.from);
    const screen = listScreen(await listCatalog(userId));
    await ctx.reply(screen.text, { reply_markup: screen.keyboard });
  });

  bot.callbackQuery(/^skill:/, async (ctx) => {
    if (!ctx.from) return;
    const [, action = '', slug = ''] = ctx.callbackQuery.data.split(':');
    const userId = await ensureUser(ctx.from);
    await ctx.answerCallbackQuery();

    if (action === 'list') {
      await showScreen(ctx, listScreen(await listCatalog(userId)));
      return;
    }

    const skill = await findPublicSkill(slug);
    if (!skill) {
      await showScreen(ctx, listScreen(await listCatalog(userId)));
      await ctx.reply('That skill is no longer available.');
      return;
    }

    switch (action) {
      case 'ask':
        await showScreen(ctx, confirmScreen(skill));
        return;
      case 'ok':
        await installSkill(userId, skill.id);
        await showScreen(ctx, listScreen(await listCatalog(userId)));
        return;
      case 'off':
        await setSkillEnabled(userId, skill.id, false);
        await showScreen(ctx, listScreen(await listCatalog(userId)));
        return;
    }
  });
}

function listScreen(entries: CatalogEntry[]): Screen {
  const keyboard = new InlineKeyboard();

  if (entries.length === 0) {
    return { text: 'No skills are available yet.', keyboard };
  }

  const lines = entries.map(({ skill, enabled }) => {
    const status = enabled ? 'installed' : 'available';
    return `${skill.slug} v${skill.version} (${status})\n${skill.description}\nNetwork: ${describeList(skill.manifest.egress)}`;
  });

  for (const { skill, enabled } of entries) {
    if (enabled) {
      keyboard.text(`Disable ${skill.slug}`, `skill:off:${skill.slug}`).row();
    } else {
      keyboard.text(`Install ${skill.slug}`, `skill:ask:${skill.slug}`).row();
    }
  }

  return {
    text: `Skills\n\nCapability packs for your account. Each one lists the network access and secrets it needs before you install it.\n\n${lines.join('\n\n')}`,
    keyboard,
  };
}

function confirmScreen(skill: {
  slug: string;
  version: string;
  description: string;
  manifest: SkillManifest;
}): Screen {
  const text = [
    `Install ${skill.slug} v${skill.version}?`,
    '',
    truncate(skill.description, 180),
    '',
    `Network access: ${describeList(skill.manifest.egress)}`,
    `Secrets: ${describeList(skill.manifest.secrets)}`,
  ].join('\n');

  return {
    text,
    keyboard: new InlineKeyboard()
      .text('Install', `skill:ok:${skill.slug}`)
      .text('Cancel', 'skill:list'),
  };
}

function describeList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'none';
}

