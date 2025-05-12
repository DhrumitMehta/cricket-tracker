-- Add user_id to training_sessions table (nullable initially)
ALTER TABLE training_sessions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing sessions to use the authenticated user's ID
-- Only update sessions that don't have a user_id
UPDATE training_sessions
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Delete any sessions that still have null user_id
-- This is a safety measure in case there are sessions that couldn't be updated
DELETE FROM training_sessions
WHERE user_id IS NULL;

-- Now we can safely make user_id NOT NULL
ALTER TABLE training_sessions
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own training sessions with training days" ON training_sessions;
DROP POLICY IF EXISTS "Users can insert their own training sessions with training days" ON training_sessions;
DROP POLICY IF EXISTS "Users can update their own training sessions with training days" ON training_sessions;
DROP POLICY IF EXISTS "Users can delete their own training sessions with training days" ON training_sessions;

-- Create new RLS policies
CREATE POLICY "Users can view their own training sessions"
    ON training_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training sessions"
    ON training_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions"
    ON training_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions"
    ON training_sessions FOR DELETE
    USING (auth.uid() = user_id); 