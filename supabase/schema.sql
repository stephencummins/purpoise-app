-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rag_status TEXT DEFAULT 'green' CHECK (rag_status IN ('red', 'amber', 'green')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stages table
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work', 'thought', 'collaboration', 'study', 'research', 'action', 'habit')),
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for goals
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for stages
CREATE POLICY "Users can view stages of their goals"
  ON stages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = stages.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert stages to their goals"
  ON stages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = stages.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update stages of their goals"
  ON stages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = stages.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete stages of their goals"
  ON stages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = stages.goal_id AND goals.user_id = auth.uid()
  ));

-- Create policies for tasks
CREATE POLICY "Users can view tasks of their goals"
  ON tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stages
    JOIN goals ON goals.id = stages.goal_id
    WHERE stages.id = tasks.stage_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert tasks to their goals"
  ON tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stages
    JOIN goals ON goals.id = stages.goal_id
    WHERE stages.id = tasks.stage_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tasks of their goals"
  ON tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stages
    JOIN goals ON goals.id = stages.goal_id
    WHERE stages.id = tasks.stage_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tasks of their goals"
  ON tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM stages
    JOIN goals ON goals.id = stages.goal_id
    WHERE stages.id = tasks.stage_id AND goals.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_stages_goal_id ON stages(goal_id);
CREATE INDEX idx_tasks_stage_id ON tasks(stage_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_category ON tasks(category);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
