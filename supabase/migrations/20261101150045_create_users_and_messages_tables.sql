/*
# Create users and messages tables for AgentBee backend

Plain-English summary: sets up the two core tables the Telegram bot writes to. Every Telegram user who talks to the bot gets one row in `users`, and every message exchanged gets a row in `messages`.

1. New Types
- `message_role` enum with values `user`, `agent`, `system` (who wrote the message).

2. New Tables
- `users`: one row per Telegram account.
  - `id` (uuid, primary key)
  - `telegram_id` (bigint, unique, required)
  - `username` (text, optional)
  - `first_name` (text, required)
  - `created_at`, `updated_at` (timestamps)
- `messages`: one row per message in a chat.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users, deleted together with the user)
  - `telegram_chat_id`, `telegram_message_id` (bigint, required)
  - `role` (message_role, required)
  - `content` (text, required)
  - `created_at` (timestamp)
- Index on messages(user_id, created_at) for loading a user's history in order.

3. Security
- Row level security is enabled on both tables.
- No policies and no grants are given to the public `anon` or `authenticated` roles, so the tables cannot be read or written through the public API.
- The backend server connects directly with its database connection string, which is a privileged role and is not affected by these restrictions.

4. Notes
- 4.1 Statements use IF NOT EXISTS so re-running this migration is safe.
- 4.2 No existing data is modified or removed.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_role') THEN
    CREATE TYPE message_role AS ENUM ('user', 'agent', 'system');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  username text,
  first_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_chat_id bigint NOT NULL,
  telegram_message_id bigint NOT NULL,
  role message_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_user_id_created_at_idx ON messages (user_id, created_at);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
