-- Add other_notes (fielding, captaincy) to matches
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS other_notes TEXT;

COMMENT ON COLUMN matches.other_notes IS 'Notes for fielding, captaincy and other aspects';
