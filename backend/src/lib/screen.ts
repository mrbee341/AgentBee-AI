import { GrammyError, InlineKeyboard, type Context } from 'grammy';

export type Screen = { text: string; keyboard: InlineKeyboard };

export async function showScreen(ctx: Context, screen: Screen): Promise<void> {
  try {
    await ctx.editMessageText(screen.text, { reply_markup: screen.keyboard });
  } catch (err) {
    const unchanged = err instanceof GrammyError && err.description.includes('message is not modified');
    if (!unchanged) throw err;
  }
}
