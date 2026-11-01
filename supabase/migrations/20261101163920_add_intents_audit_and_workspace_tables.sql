/*
# Add approval ledger, audit log and workspace files

Plain-English summary: adds the tables that let the bot ask before it changes anything. Each proposed change is stored as an "intent" with a one-time approval token that expires after five minutes. Every approval, rejection, and tool run is written to an audit log. A simple per-user workspace stores files the bot is allowed to write.

1. New Types
- `intent_status` enum: pending, approved, rejected, expired, executed, failed.

2. New Tables
- `intents`: one row per proposed change.
  - `tool`, `payload` (the arguments), `preview` (the text shown on the approval card)
  - `status`, `token` (a hash of the one-time approval token, never the token itself)
  - `expires_at` (five minutes after creation), `idem_key` (unique key per proposal)
  - `chat_id`, `card_message_id` (where the approval card lives, so it can be updated)
- `audit`: append-only log of approvals, rejections, and tool runs.
  - `actor`, `action`, `target`, `before`, `after`, `tx_hash` (reserved for on-chain actions)
- `workspace_files`: small text files the bot writes for the user, unique per user and path.

3. Indexes
- `intents(user_id, status, created_at)` to find a user's open approvals.
- `audit(user_id, created_at)` to read a user's history in order.

4. Security
- Row level security is enabled on all three tables.
- No policies and no grants are given to `anon` or `authenticated`. The backend uses its privileged connection, which is unaffected.

5. Notes
- 5.1 Statements use IF NOT EXISTS, so re-running is safe.
- 5.2 No existing data is modified or removed.
- 5.3 Constraint names are set explicitly so the backend schema definitions match the database exactly.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intent_status') THEN
    CREATE TYPE intent_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'executed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  payload jsonb NOT NULL,
  preview text NOT NULL,
  status intent_status NOT NULL DEFAULT 'pending',
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  idem_key text NOT NULL,
  chat_id bigint NOT NULL,
  card_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT intents_token_unique UNIQUE (token),
  CONSTRAINT intents_idem_key_unique UNIQUE (idem_key)
);

CREATE INDEX IF NOT EXISTS intents_user_id_status_created_at_idx ON intents (user_id, status, created_at);

CREATE TABLE IF NOT EXISTS audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor text NOT NULL,
  action text NOT NULL,
  target text,
  before jsonb,
  after jsonb,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS audit_user_id_created_at_idx ON audit (user_id, created_at);

CREATE TABLE IF NOT EXISTS workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path text NOT NULL,
  content text NOT NULL,
  size_bytes integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT workspace_files_user_id_path_unique UNIQUE (user_id, path)
);

ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
