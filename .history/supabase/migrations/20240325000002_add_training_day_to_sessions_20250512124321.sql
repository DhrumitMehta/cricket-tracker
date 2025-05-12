-- Add training_day_id to training_sessions table
ALTER TABLE training_sessions
ADD COLUMN training_day_id UUID REFERENCES training_days(id) ON DELETE SET NULL;

-- Update RLS policies to allow access to training sessions with training days
CREATE POLICY "Users can view their own training sessions with training days"
    ON training_sessions FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM training_days
            WHERE training_days.id = training_sessions.training_day_id
            AND training_days.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own training sessions with training days"
    ON training_sessions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM training_days
            WHERE training_days.id = training_sessions.training_day_id
            AND training_days.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own training sessions with training days"
    ON training_sessions FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM training_days
            WHERE training_days.id = training_sessions.training_day_id
            AND training_days.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own training sessions with training days"
    ON training_sessions FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM training_days
            WHERE training_days.id = training_sessions.training_day_id
            AND training_days.user_id = auth.uid()
        )
    ); 