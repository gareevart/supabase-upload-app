-- Track when each result was recorded (for monthly leaderboard reset)
ALTER TABLE memory_game_results
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS memory_game_results_created_at_idx
ON memory_game_results (created_at DESC);
