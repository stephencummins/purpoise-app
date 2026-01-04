const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/add_quick_tasks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration to create quick_tasks table...');

    // Note: This won't work with the anon key - you need to run this SQL directly in Supabase SQL editor
    console.log('\n⚠️  IMPORTANT: Copy the SQL below and run it in your Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/qpmewfobfnbprlnfgayh/sql/new\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('\nAfter running the SQL in Supabase, the Quick Tasks feature will be ready to use!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyMigration();
