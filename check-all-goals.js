// Check all goals in database regardless of user
const { createClient } = require('@supabase/supabase-js');

// Use service role key or check with anon key
const supabase = createClient(
  'https://qpmewfobfnbprlnfgayh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU'
);

async function checkAllGoals() {
  try {
    // Try to get count first
    const { count, error: countError } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true });

    console.log('Total goals in database:', count);
    if (countError) console.error('Count error:', countError);

    // Try to get all goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*');

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    } else {
      console.log('\nGoals visible to anon key:', goals.length);
      goals.forEach(goal => {
        console.log(`  - ${goal.title} (user: ${goal.user_id})`);
      });
    }

    // Check the specific goal ID from console logs
    const { data: specificGoal, error: specificError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', 'fa2447e3-a505-4032-a042-b9530c879785')
      .single();

    if (specificError) {
      console.log('\nSpecific goal fa2447e3... not found:', specificError.message);
    } else {
      console.log('\nSpecific goal found:', specificGoal);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllGoals();
