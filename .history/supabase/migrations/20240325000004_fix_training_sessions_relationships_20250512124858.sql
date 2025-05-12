-- First, drop the existing training_day_id column if it exists
ALTER TABLE training_sessions
DROP COLUMN IF EXISTS training_day_id;

-- Add the training_day_id column with proper foreign key constraint
ALTER TABLE training_sessions
ADD COLUMN training_day_id UUID REFERENCES training_days(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_training_day_id 
ON training_sessions(training_day_id);

-- Update RLS policies to handle the relationship
DROP POLICY IF EXISTS "Users can view their own training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Users can insert their own training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Users can update their own training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Users can delete their own training sessions" ON training_sessions;

-- Create new RLS policies that handle both direct ownership and training day relationships
CREATE POLICY "Users can view their own training sessions"
    ON training_sessions FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM training_days
            WHERE training_days.id = training_sessions.training_day_id
            AND training_days.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own training sessions"
    ON training_sessions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        (
            training_day_id IS NULL OR
            EXISTS (
                SELECT 1 FROM training_days
                WHERE training_days.id = training_sessions.training_day_id
                AND training_days.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own training sessions"
    ON training_sessions FOR UPDATE
    USING (
        auth.uid() = user_id AND
        (
            training_day_id IS NULL OR
            EXISTS (
                SELECT 1 FROM training_days
                WHERE training_days.id = training_sessions.training_day_id
                AND training_days.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own training sessions"
    ON training_sessions FOR DELETE
    USING (
        auth.uid() = user_id AND
        (
            training_day_id IS NULL OR
            EXISTS (
                SELECT 1 FROM training_days
                WHERE training_days.id = training_sessions.training_day_id
                AND training_days.user_id = auth.uid()
            )
        )
    ); 