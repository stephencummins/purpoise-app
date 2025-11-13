# Recurring Tasks Feature Setup

## Step 1: Run SQL Migration

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qpmewfobfnbprlnfgayh/sql/new) and run this SQL:

```sql
-- Add recurring task fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day BETWEEN 0 AND 6);

-- Set default value for existing tasks
UPDATE tasks SET recurrence = 'none' WHERE recurrence IS NULL;

-- Add index for recurring tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence);

-- Add comments
COMMENT ON COLUMN tasks.recurrence IS 'Recurrence type: none (default), daily, or weekly';
COMMENT ON COLUMN tasks.recurrence_day IS 'Day of week for weekly recurrence (0=Sunday, 1=Monday, ..., 6=Saturday). NULL for daily tasks.';
```

## Step 2: How It Works

### Daily Tasks
- Set `recurrence = 'daily'`
- Tasks auto-reset every day at midnight
- Example: "Exercise", "Read for 30 minutes", "Review goals"

### Weekly Tasks
- Set `recurrence = 'weekly'`
- Set `recurrence_day` to day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
- Tasks auto-reset on specified day each week
- Example: "Weekly review" (every Sunday), "Team meeting notes" (every Monday)

### Auto-Reset Logic
- When you mark a recurring task complete, it records the completion
- Next day (or next week), the task automatically uncompletes
- Your completion history is preserved in `last_completed_date`
- Habit streaks continue to work

## Step 3: Creating Recurring Tasks

In the app, you'll have a new "Recurring Tasks" section where you can:
1. Add new recurring tasks
2. Choose daily or weekly frequency
3. For weekly tasks, select which day
4. Mark them complete each day/week
5. View your completion streaks

## Technical Details

The app checks recurring tasks on load and resets them based on:
- **Daily tasks**: If `last_completed_date` < today, reset to incomplete
- **Weekly tasks**: If `last_completed_date` < this week's recurrence day, reset to incomplete

This means tasks stay completed until the next scheduled reset.
