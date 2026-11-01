import express from 'express';
import { webhookCallback } from 'grammy';
import { bot, BOT_COMMANDS } from './bot.js';
import { config } from './config.js';

const WEBHOOK_PATH = '/telegram/webhook';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post(
  WEBHOOK_PATH,
  express.json(),
  webhookCallback(bot, 'express', { secretToken: config.WEBHOOK_SECRET }),
);

async function main() {
  await bot.init();
  await bot.api.setMyCommands(BOT_COMMANDS);

  if (config.WEBHOOK_URL) {
    await bot.api.setWebhook(config.WEBHOOK_URL, {
      secret_token: config.WEBHOOK_SECRET,
    });
    console.log(`Telegram webhook set to ${config.WEBHOOK_URL}`);
  }

  app.listen(config.PORT, () => {
    console.log(`AgentBee backend listening on port ${config.PORT}`);
    console.log(`Telegram webhook route: ${WEBHOOK_PATH}`);
  });
}

main().catch((err) => {
  console.error('Failed to start AgentBee backend:', err);
  process.exit(1);
});
