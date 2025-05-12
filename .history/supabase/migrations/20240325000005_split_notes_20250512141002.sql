-- Add new columns for split notes
ALTER TABLE training_sessions
ADD COLUMN technical_notes TEXT,
ADD COLUMN tactical_notes TEXT;

-- Migrate existing notes to technical_notes
UPDATE training_sessions
SET technical_notes = notes
WHERE notes IS NOT NULL;

-- Drop the old notes column
ALTER TABLE training_sessions
DROP COLUMN notes; 