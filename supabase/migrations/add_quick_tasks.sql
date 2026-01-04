-- Create quick_tasks table for simple one-line tasks
CREATE TABLE IF NOT EXISTS quick_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quick_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for quick_tasks
CREATE POLICY "Users can view their own quick tasks"
  ON quick_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick tasks"
  ON quick_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick tasks"
  ON quick_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick tasks"
  ON quick_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_quick_tasks_user_id ON quick_tasks(user_id);
CREATE INDEX idx_quick_tasks_completed ON quick_tasks(completed);

-- Create trigger for updated_at
CREATE TRIGGER update_quick_tasks_updated_at BEFORE UPDATE ON quick_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
