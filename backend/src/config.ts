import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  BOT_TOKEN: requireEnv('BOT_TOKEN'),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  PORT: Number(process.env.PORT ?? 3000),
  WEBHOOK_URL: process.env.WEBHOOK_URL || undefined,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || undefined,
};
