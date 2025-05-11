-- Create study_notes table
CREATE TABLE study_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('batting', 'bowling', 'fielding', 'fitness', 'captaincy')),
    type TEXT NOT NULL CHECK (type IN ('tactical', 'technical')),
    content TEXT NOT NULL,
    link TEXT,
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study notes"
    ON study_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study notes"
    ON study_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study notes"
    ON study_notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study notes"
    ON study_notes FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_study_notes_updated_at
    BEFORE UPDATE ON study_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 