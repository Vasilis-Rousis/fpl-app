-- ============================================================
-- FPL App Database Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- CORE REFERENCE TABLES (from bootstrap-static)

CREATE TABLE IF NOT EXISTS teams (
  id              INT PRIMARY KEY,
  code            INT NOT NULL,
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  strength        INT,
  strength_overall_home   INT,
  strength_overall_away   INT,
  strength_attack_home    INT,
  strength_attack_away    INT,
  strength_defence_home   INT,
  strength_defence_away   INT,
  position        INT,
  played          INT,
  win             INT,
  draw            INT,
  loss            INT,
  points          INT,
  form            TEXT,
  pulse_id        INT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gameweeks (
  id                      INT PRIMARY KEY,
  name                    TEXT NOT NULL,
  deadline_time           TIMESTAMPTZ,
  deadline_time_epoch     BIGINT,
  average_entry_score     INT,
  highest_score           INT,
  finished                BOOLEAN DEFAULT FALSE,
  data_checked            BOOLEAN DEFAULT FALSE,
  is_previous             BOOLEAN DEFAULT FALSE,
  is_current              BOOLEAN DEFAULT FALSE,
  is_next                 BOOLEAN DEFAULT FALSE,
  most_selected           INT,
  most_captained          INT,
  most_vice_captained     INT,
  most_transferred_in     INT,
  top_element             INT,
  chip_plays              JSONB,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id                      INT PRIMARY KEY,
  code                    INT NOT NULL,
  first_name              TEXT,
  second_name             TEXT,
  web_name                TEXT NOT NULL,
  team                    INT REFERENCES teams(id),
  element_type            INT NOT NULL,
  now_cost                INT NOT NULL,
  status                  TEXT,
  chance_of_playing_next_round INT,
  chance_of_playing_this_round INT,
  news                    TEXT,
  news_added              TIMESTAMPTZ,
  form                    TEXT,
  points_per_game         TEXT,
  selected_by_percent     TEXT,
  total_points            INT,
  event_points            INT,
  minutes                 INT,
  goals_scored            INT,
  assists                 INT,
  clean_sheets            INT,
  goals_conceded          INT,
  own_goals               INT,
  penalties_saved         INT,
  penalties_missed        INT,
  yellow_cards            INT,
  red_cards               INT,
  saves                   INT,
  bonus                   INT,
  bps                     INT,
  influence               TEXT,
  creativity              TEXT,
  threat                  TEXT,
  ict_index               TEXT,
  starts                  INT,
  expected_goals          TEXT,
  expected_assists        TEXT,
  expected_goal_involvements TEXT,
  expected_goals_conceded TEXT,
  transfers_in            INT,
  transfers_in_event      INT,
  transfers_out           INT,
  transfers_out_event     INT,
  cost_change_event       INT,
  cost_change_start       INT,
  value_form              TEXT,
  value_season            TEXT,
  ep_next                 TEXT,
  ep_this                 TEXT,
  corners_and_indirect_freekicks_order INT,
  penalties_order         INT,
  dreamteam_count         INT,
  in_dreamteam            BOOLEAN,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_element_type ON players(element_type);
CREATE INDEX IF NOT EXISTS idx_players_now_cost ON players(now_cost);

-- FIXTURES

CREATE TABLE IF NOT EXISTS fixtures (
  id                INT PRIMARY KEY,
  code              INT,
  event             INT REFERENCES gameweeks(id),
  team_h            INT REFERENCES teams(id),
  team_a            INT REFERENCES teams(id),
  team_h_score      INT,
  team_a_score      INT,
  team_h_difficulty INT,
  team_a_difficulty INT,
  kickoff_time      TIMESTAMPTZ,
  finished          BOOLEAN DEFAULT FALSE,
  finished_provisional BOOLEAN DEFAULT FALSE,
  started           BOOLEAN DEFAULT FALSE,
  minutes           INT,
  stats             JSONB,
  pulse_id          INT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_event ON fixtures(event);
CREATE INDEX IF NOT EXISTS idx_fixtures_team_h ON fixtures(team_h);
CREATE INDEX IF NOT EXISTS idx_fixtures_team_a ON fixtures(team_a);

-- PLAYER GAMEWEEK HISTORY

CREATE TABLE IF NOT EXISTS player_history (
  id                SERIAL PRIMARY KEY,
  element           INT REFERENCES players(id),
  fixture           INT,
  opponent_team     INT REFERENCES teams(id),
  round             INT REFERENCES gameweeks(id),
  was_home          BOOLEAN,
  kickoff_time      TIMESTAMPTZ,
  total_points      INT,
  minutes           INT,
  goals_scored      INT,
  assists           INT,
  clean_sheets      INT,
  goals_conceded    INT,
  own_goals         INT,
  penalties_saved   INT,
  penalties_missed  INT,
  yellow_cards      INT,
  red_cards         INT,
  saves             INT,
  bonus             INT,
  bps               INT,
  influence         TEXT,
  creativity        TEXT,
  threat            TEXT,
  ict_index         TEXT,
  starts            INT,
  expected_goals    TEXT,
  expected_assists  TEXT,
  expected_goal_involvements TEXT,
  expected_goals_conceded TEXT,
  value             INT,
  transfers_balance INT,
  selected          INT,
  transfers_in      INT,
  transfers_out     INT,
  UNIQUE(element, round)
);

CREATE INDEX IF NOT EXISTS idx_player_history_element ON player_history(element);
CREATE INDEX IF NOT EXISTS idx_player_history_round ON player_history(round);

-- LIVE GAMEWEEK DATA

CREATE TABLE IF NOT EXISTS live_gameweek (
  id                SERIAL PRIMARY KEY,
  event             INT REFERENCES gameweeks(id),
  element           INT REFERENCES players(id),
  total_points      INT,
  stats             JSONB,
  explain_data      JSONB,
  modified          BOOLEAN,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event, element)
);

CREATE INDEX IF NOT EXISTS idx_live_gw_event ON live_gameweek(event);

-- MANAGER DATA

CREATE TABLE IF NOT EXISTS manager_history (
  id                SERIAL PRIMARY KEY,
  manager_id        INT NOT NULL,
  event             INT REFERENCES gameweeks(id),
  points            INT,
  total_points      INT,
  rank              INT,
  overall_rank      INT,
  bank              INT,
  value             INT,
  event_transfers   INT,
  event_transfers_cost INT,
  points_on_bench   INT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, event)
);

CREATE TABLE IF NOT EXISTS manager_picks (
  id                SERIAL PRIMARY KEY,
  manager_id        INT NOT NULL,
  event             INT REFERENCES gameweeks(id),
  element           INT REFERENCES players(id),
  position          INT,
  multiplier        INT,
  is_captain        BOOLEAN DEFAULT FALSE,
  is_vice_captain   BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, event, element)
);

CREATE INDEX IF NOT EXISTS idx_manager_picks_manager_event ON manager_picks(manager_id, event);

CREATE TABLE IF NOT EXISTS manager_transfers (
  id                SERIAL PRIMARY KEY,
  manager_id        INT NOT NULL,
  element_in        INT REFERENCES players(id),
  element_in_cost   INT,
  element_out       INT REFERENCES players(id),
  element_out_cost  INT,
  entry             INT,
  event             INT REFERENCES gameweeks(id),
  time              TIMESTAMPTZ,
  UNIQUE(manager_id, event, element_in, element_out)
);

-- H2H LEAGUE DATA

CREATE TABLE IF NOT EXISTS h2h_matches (
  id                      INT PRIMARY KEY,
  league_id               INT NOT NULL,
  event                   INT REFERENCES gameweeks(id),
  entry_1_entry           INT,
  entry_1_name            TEXT,
  entry_1_player_name     TEXT,
  entry_1_points          INT,
  entry_1_win             INT,
  entry_1_draw            INT,
  entry_1_loss            INT,
  entry_1_total           INT,
  entry_2_entry           INT,
  entry_2_name            TEXT,
  entry_2_player_name     TEXT,
  entry_2_points          INT,
  entry_2_win             INT,
  entry_2_draw            INT,
  entry_2_loss            INT,
  entry_2_total           INT,
  is_knockout             BOOLEAN DEFAULT FALSE,
  winner                  INT,
  seed_value              INT,
  tiebreak                TEXT,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h2h_league ON h2h_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_h2h_event ON h2h_matches(event);

-- COMPUTED TABLES

CREATE TABLE IF NOT EXISTS player_scores (
  id                SERIAL PRIMARY KEY,
  element           INT REFERENCES players(id),
  gameweek          INT REFERENCES gameweeks(id),
  composite_score   FLOAT NOT NULL,
  form_score        FLOAT,
  fixture_score     FLOAT,
  consistency_score FLOAT,
  value_score       FLOAT,
  home_away_score   FLOAT,
  captain_score     FLOAT,
  computed_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(element, gameweek)
);

CREATE INDEX IF NOT EXISTS idx_player_scores_gw ON player_scores(gameweek);
CREATE INDEX IF NOT EXISTS idx_player_scores_composite ON player_scores(composite_score DESC);

-- SYNC LOG

CREATE TABLE IF NOT EXISTS sync_log (
  id                SERIAL PRIMARY KEY,
  sync_type         TEXT NOT NULL,
  sync_key          TEXT,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  status            TEXT DEFAULT 'running',
  error_message     TEXT,
  rows_affected     INT
);
