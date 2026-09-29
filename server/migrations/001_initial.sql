CREATE SCHEMA IF NOT EXISTS espumas;

CREATE TABLE IF NOT EXISTS espumas.compositions (
  map text PRIMARY KEY,
  picks jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  observations text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS espumas.training_results (
  map text PRIMARY KEY,
  wins integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses integer NOT NULL DEFAULT 0 CHECK (losses >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS espumas.team_observations (
  id integer PRIMARY KEY CHECK (id = 1),
  observations text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS espumas.tactics_boards (
  map text NOT NULL,
  phase text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (map, phase)
);
