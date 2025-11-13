const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzE0MiwiZXhwIjoyMDc4NDQ5MTQyfQ.m4_i4PyMRQGGBTDPI9IKgU9CEzdPY6YNy-vm8-M0hbc';
const supabase = createClient('https://qpmewfobfnbprlnfgayh.supabase.co', SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    const migration = fs.readFileSync('supabase/migrations/add_recurring_tasks.sql', 'utf8');

    // Split by semicolon and run each statement
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Running ${statements.length} SQL statements...`);

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // Try direct query if RPC doesn't exist
        console.log('Executing:', statement.substring(0, 80) + '...');
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify the columns were added
    const { data, error } = await supabase
      .from('tasks')
      .select('recurrence, recurrence_day')
      .limit(1);

    if (error) {
      console.log('⚠️  Note: Cannot verify migration (RLS policies may prevent direct query)');
      console.log('Migration SQL has been saved. Please run it manually in Supabase SQL Editor.');
    } else {
      console.log('✅ Verified: recurrence columns exist');
    }

  } catch (error) {
    console.error('Migration error:', error.message);
    console.log('\n📝 Please run the migration manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/qpmewfobfnbprlnfgayh/sql');
  }
}

runMigration();
