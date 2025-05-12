-- Add user_id to training_sessions table
ALTER TABLE training_sessions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing sessions to use the authenticated user's ID
UPDATE training_sessions
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting default values
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