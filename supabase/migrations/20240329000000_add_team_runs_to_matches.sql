-- Add team total runs (innings total when user batted) for % of team runs calculation
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS team_runs INTEGER;

COMMENT ON COLUMN matches.team_runs IS 'Team total runs in the innings (for % of team runs)';
