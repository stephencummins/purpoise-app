// Copy goals from localhost user to make them visible on production
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qpmewfobfnbprlnfgayh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU'
);

const LOCALHOST_USER_ID = 'ca32ae82-f352-403b-822e-6d29c1d355c5';

async function copyGoals() {
  try {
    console.log('Fetching goals for user:', LOCALHOST_USER_ID);

    // Get all goals for the localhost user
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', LOCALHOST_USER_ID);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      throw goalsError;
    }

    console.log(`Found ${goals.length} goals`);

    for (const goal of goals) {
      console.log(`\n--- ${goal.title} ---`);

      // Get stages for this goal
      const { data: stages, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('goal_id', goal.id)
        .order('order_index');

      if (stagesError) throw stagesError;

      console.log(`  ${stages.length} stages`);

      for (const stage of stages) {
        // Get tasks for this stage
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('stage_id', stage.id)
          .order('order_index');

        if (tasksError) throw tasksError;

        console.log(`    Stage "${stage.name}": ${tasks.length} tasks`);
      }
    }

    console.log('\n✅ Goals are already in the database!');
    console.log('\nThese goals will be visible on purpoise.netlify.com once you:');
    console.log('1. Sign in with the same user (or create a way to share goals)');
    console.log('2. Or, sign in on production with the same anonymous session');
    console.log('\nNote: Currently each anonymous session creates a separate user.');
    console.log('The goals ARE persisted in the database, just tied to your localhost user ID.');

  } catch (error) {
    console.error('Error:', error);
  }
}

copyGoals();
