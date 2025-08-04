-- Create user_trials table for tracking trial periods
CREATE TABLE IF NOT EXISTS user_trials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_beta_user BOOLEAN NOT NULL DEFAULT false,
    beta_user_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_email ON user_trials(email);
CREATE INDEX IF NOT EXISTS idx_user_trials_is_active ON user_trials(is_active);
CREATE INDEX IF NOT EXISTS idx_user_trials_is_beta_user ON user_trials(is_beta_user);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_trials_updated_at 
    BEFORE UPDATE ON user_trials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trial data" ON user_trials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trial data" ON user_trials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trial data" ON user_trials
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get beta user count
CREATE OR REPLACE FUNCTION get_beta_user_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN COUNT(*) FROM user_trials WHERE is_beta_user = true AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next beta user number
CREATE OR REPLACE FUNCTION get_next_beta_user_number()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(MAX(beta_user_number), 0) + 1 FROM user_trials WHERE is_beta_user = true;
END;
$$ LANGUAGE plpgsql; 