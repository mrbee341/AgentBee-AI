import { Bot } from 'grammy';
import { config } from './config.js';
import { registerBrainHandlers } from './handlers/brain.js';
import { registerSkillHandlers } from './handlers/skills.js';
import { registerStartHandler } from './handlers/start.js';
import { registerTextHandler } from './handlers/text.js';

export const bot = new Bot(config.BOT_TOKEN);

export const BOT_COMMANDS = [
  { command: 'start', description: 'Say hello and see what AgentBee can do' },
  { command: 'brain', description: 'Review and correct what AgentBee remembers' },
  { command: 'skills', description: 'Browse and install skills' },
];

registerStartHandler(bot);
registerBrainHandlers(bot);
registerSkillHandlers(bot);
registerTextHandler(bot);

bot.catch((err) => {
  console.error('Bot error while handling update:', err.error);
});
