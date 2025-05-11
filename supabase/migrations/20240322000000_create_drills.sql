-- Create drills table
CREATE TABLE drills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('batting', 'bowling', 'fielding', 'fitness')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    description TEXT NOT NULL,
    equipment_needed TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own drills"
    ON drills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drills"
    ON drills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drills"
    ON drills FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drills"
    ON drills FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON drills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 