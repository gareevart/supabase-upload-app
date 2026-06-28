-- Public read/write for memory game leaderboard (anonymous players)
ALTER TABLE memory_game_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read memory game results" ON memory_game_results;
DROP POLICY IF EXISTS "Allow public insert memory game results" ON memory_game_results;

CREATE POLICY "Allow public read memory game results"
ON memory_game_results
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert memory game results"
ON memory_game_results
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
