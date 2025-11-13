-- Add recurring task fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day BETWEEN 0 AND 6);

-- Set default value for existing tasks
UPDATE tasks SET recurrence = 'none' WHERE recurrence IS NULL;

-- Make recurrence NOT NULL with default
ALTER TABLE tasks ALTER COLUMN recurrence SET DEFAULT 'none';
ALTER TABLE tasks ALTER COLUMN recurrence SET NOT NULL;

-- Add index for recurring tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence);

-- Add comment
COMMENT ON COLUMN tasks.recurrence IS 'Recurrence type: none, daily, or weekly';
COMMENT ON COLUMN tasks.recurrence_day IS 'Day of week for weekly recurrence (0=Sunday, 6=Saturday)';
