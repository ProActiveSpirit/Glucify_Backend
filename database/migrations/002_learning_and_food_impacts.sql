-- User learning state (per user)
CREATE TABLE IF NOT EXISTS user_learning_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correction_factor JSONB NOT NULL DEFAULT '{"morning":null,"afternoon":null,"evening":null,"overnight":null}',
  insulin_to_carb_ratio JSONB NOT NULL DEFAULT '{"breakfast":null,"lunch":null,"dinner":null}',
  dawn_phenomenon JSONB,
  exercise_impact_mgdl INTEGER,
  data_points INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_learning_state_user_id ON user_learning_state(user_id);

-- Food impact patterns (per user, per normalized food name)
CREATE TABLE IF NOT EXISTS user_food_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  avg_peak NUMERIC NOT NULL DEFAULT 0,
  avg_duration_min NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, food_key)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_learning_state_updated_at
  BEFORE UPDATE ON user_learning_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_food_impacts_updated_at
  BEFORE UPDATE ON user_food_impacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_learning_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_food_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own learning state" ON user_learning_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own learning state" ON user_learning_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own learning state" ON user_learning_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users select own food impacts" ON user_food_impacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own food impacts" ON user_food_impacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own food impacts" ON user_food_impacts
  FOR UPDATE USING (auth.uid() = user_id);

