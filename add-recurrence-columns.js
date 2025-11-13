const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzE0MiwiZXhwIjoyMDc4NDQ5MTQyfQ.m4_i4PyMRQGGBTDPI9IKgU9CEzdPY6YNy-vm8-M0hbc';
const supabase = createClient('https://qpmewfobfnbprlnfgayh.supabase.co', SERVICE_ROLE_KEY);

async function addRecurrenceColumns() {
  console.log('Adding recurrence columns to tasks table...');
  console.log('\n📝 Please run the following SQL in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/qpmewfobfnbprlnfgayh/sql/new\n');
  console.log('--- Copy this SQL ---');
  console.log(`
-- Add recurring task fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day BETWEEN 0 AND 6);

-- Set default value for existing tasks
UPDATE tasks SET recurrence = 'none' WHERE recurrence IS NULL;

-- Add index for recurring tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence);
  `.trim());
  console.log('\n--- End SQL ---\n');

  // Test if we can query tasks to see structure
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying tasks:', error);
  } else if (tasks && tasks.length > 0) {
    console.log('Current task schema columns:', Object.keys(tasks[0]));
  }
}

addRecurrenceColumns();
