// Migrate goals from anonymous user to Google account
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qpmewfobfnbprlnfgayh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU'
);

const OLD_USER_ID = 'ca32ae82-f352-403b-822e-6d29c1d355c5'; // Anonymous user
const NEW_USER_ID = '29022849-f9d3-4f5e-8f8a-2c203c8b4699'; // Google account user (from the JWT token you showed)

async function migrateGoals() {
  try {
    console.log('Starting migration...');
    console.log(`From user: ${OLD_USER_ID}`);
    console.log(`To user: ${NEW_USER_ID}`);

    // Update all goals to new user ID
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .update({ user_id: NEW_USER_ID })
      .eq('user_id', OLD_USER_ID)
      .select();

    if (goalsError) {
      console.error('Error updating goals:', goalsError);
      throw goalsError;
    }

    console.log(`✅ Successfully migrated ${goals.length} goals!`);

    // List the migrated goals
    goals.forEach(goal => {
      console.log(`  - ${goal.title}`);
    });

    console.log('\n🎉 Migration complete! Your goals should now be visible on purpoise.netlify.app');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateGoals();
