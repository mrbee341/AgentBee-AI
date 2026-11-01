import { Bot } from 'grammy';
import { config } from './config.js';
import { registerApprovalHandlers } from './handlers/approvals.js';
import { registerBrainHandlers } from './handlers/brain.js';
import { registerSkillHandlers } from './handlers/skills.js';
import { registerStartHandler } from './handlers/start.js';
import { registerTextHandler } from './handlers/text.js';
import { registerToolHandlers } from './handlers/tools.js';

export const bot = new Bot(config.BOT_TOKEN);

export const BOT_COMMANDS = [
  { command: 'start', description: 'Say hello and see what AgentBee can do' },
  { command: 'brain', description: 'Review and correct what AgentBee remembers' },
  { command: 'skills', description: 'Browse and install skills' },
  { command: 'remember', description: 'Ask AgentBee to keep something in mind (needs approval)' },
  { command: 'forget', description: 'Remove remembered facts matching words (needs approval)' },
  { command: 'write', description: 'Save a workspace file (needs approval)' },
  { command: 'read', description: 'Read a workspace file' },
  { command: 'ls', description: 'List workspace files' },
  { command: 'search', description: 'Look up quick answers on the web' },
  { command: 'fetch', description: 'Read the text of a public web page' },
];

registerStartHandler(bot);
registerBrainHandlers(bot);
registerSkillHandlers(bot);
registerToolHandlers(bot);
registerApprovalHandlers(bot);
registerTextHandler(bot);

bot.catch((err) => {
  console.error('Bot error while handling update:', err.error);
});
