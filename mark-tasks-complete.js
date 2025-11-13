const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const supabase = createClient('https://qpmewfobfnbprlnfgayh.supabase.co', SERVICE_ROLE_KEY);

async function markTasksComplete() {
  // Get all goals for the user
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', '29022849-f9d3-4f5e-8f8a-2c203c8b4699');

  if (goalsError || !goals) {
    console.error('Goals error:', goalsError);
    return;
  }

  console.log('Found', goals.length, 'goals');

  // Get all stages and tasks
  const goalIds = goals.map(g => g.id);
  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, goal_id')
    .in('goal_id', goalIds);

  if (stagesError || !stages) {
    console.error('Stages error:', stagesError);
    return;
  }

  const stageIds = stages.map(s => s.id);
  const { data: allTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stageIds)
    .eq('completed', false)
    .limit(5);

  if (tasksError || !allTasks) {
    console.error('Tasks error:', tasksError);
    return;
  }

  console.log('\nMarking the following', allTasks.length, 'tasks as completed:');
  if (allTasks.length > 0) {
    console.log('First task structure:', Object.keys(allTasks[0]));
  }
  allTasks.forEach(t => console.log('  - Task ID:', t.id));

  // Mark them as completed with current timestamp
  const now = new Date().toISOString();
  const taskIds = allTasks.map(t => t.id);

  const { data: updated, error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      last_completed_date: now
    })
    .in('id', taskIds)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n✅ Successfully marked', updated.length, 'tasks as completed!');
    console.log('Completed at:', now);
    console.log('\nRefresh purpoise.netlify.app to see them in "This Week"');
  }
}

markTasksComplete();
