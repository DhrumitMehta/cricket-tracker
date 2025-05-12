-- Drop existing tables and policies
DROP POLICY IF EXISTS "Users can view their own training day drills" ON training_day_drills;
DROP POLICY IF EXISTS "Users can insert their own training day drills" ON training_day_drills;
DROP POLICY IF EXISTS "Users can update their own training day drills" ON training_day_drills;
DROP POLICY IF EXISTS "Users can delete their own training day drills" ON training_day_drills;

DROP POLICY IF EXISTS "Users can view their own training days" ON training_days;
DROP POLICY IF EXISTS "Users can insert their own training days" ON training_days;
DROP POLICY IF EXISTS "Users can update their own training days" ON training_days;
DROP POLICY IF EXISTS "Users can delete their own training days" ON training_days;

DROP TABLE IF EXISTS training_day_drills;
DROP TABLE IF EXISTS training_days;

-- Create training_days table with user_id
CREATE TABLE training_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Tactical', 'Technical', 'Fun')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create training_day_drills junction table
CREATE TABLE training_day_drills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    training_day_id UUID NOT NULL REFERENCES training_days(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(training_day_id, drill_id)
);

-- Add RLS policies
ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_day_drills ENABLE ROW LEVEL SECURITY;

-- Create policies for training_days
CREATE POLICY "Users can view their own training days"
    ON training_days FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training days"
    ON training_days FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training days"
    ON training_days FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training days"
    ON training_days FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for training_day_drills
CREATE POLICY "Users can view their own training day drills"
    ON training_day_drills FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM training_days
        WHERE training_days.id = training_day_drills.training_day_id
        AND training_days.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own training day drills"
    ON training_day_drills FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM training_days
        WHERE training_days.id = training_day_drills.training_day_id
        AND training_days.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own training day drills"
    ON training_day_drills FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM training_days
        WHERE training_days.id = training_day_drills.training_day_id
        AND training_days.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own training day drills"
    ON training_day_drills FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM training_days
        WHERE training_days.id = training_day_drills.training_day_id
        AND training_days.user_id = auth.uid()
    )); 