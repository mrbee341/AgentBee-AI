/*
# Add memory (facts) and skills tables

Plain-English summary: adds the storage the bot needs for long-term memory and capability packs. Each remembered fact belongs to one user and points back to the message it came from. Skills are a shared catalog, and each user records which skills they have installed.

1. New Tables
- `facts`: one row per remembered fact about a user.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users, deleted with the user)
  - `key` (text, structural label such as "allergy:shellfish"; unique per user)
  - `value` (text, the fact as a readable sentence)
  - `source_msg` (uuid, references messages, cleared if the source message is removed)
  - `confidence` (double precision, default 1)
  - `pinned` (boolean, default false; set when the user corrects a fact so automatic extraction will not overwrite it)
  - `created_at` (timestamp)
- `skills`: the catalog of capability packs.
  - `id`, `slug` (unique), `version`, `description`, `manifest` (jsonb: declared network access and secrets), `is_public`, `installs`, `created_at`
- `user_skills`: which skills each user has installed.
  - `id`, `user_id`, `skill_id`, `config` (jsonb), `enabled`, `installed_at`
  - One row per user and skill.

2. Indexes
- `facts(user_id, created_at)` for listing a user's facts newest first.

3. Seed data
- One starter skill, `research-brief`, so the skills list is not empty.

4. Security
- Row level security is enabled on all three new tables.
- No policies and no grants are given to `anon` or `authenticated`, matching the existing tables. The backend connects with its privileged database connection string, which is unaffected.

5. Notes
- 5.1 Statements use IF NOT EXISTS and ON CONFLICT DO NOTHING, so re-running this migration is safe.
- 5.2 No existing data is modified or removed.
*/

CREATE TABLE IF NOT EXISTS facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  source_msg uuid REFERENCES messages(id) ON DELETE SET NULL,
  confidence double precision NOT NULL DEFAULT 1,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facts_user_id_key_unique UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS facts_user_id_created_at_idx ON facts (user_id, created_at);

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  version text NOT NULL,
  description text NOT NULL,
  manifest jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  installs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  installed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_skills_user_id_skill_id_unique UNIQUE (user_id, skill_id)
);

ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

INSERT INTO skills (slug, version, description, manifest, is_public)
VALUES (
  'research-brief',
  '0.1.0',
  'Turns a question into a short brief with cited sources.',
  '{"egress": [], "secrets": [], "schedule": null}'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;
