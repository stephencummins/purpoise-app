const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzE0MiwiZXhwIjoyMDc4NDQ5MTQyfQ.m4_i4PyMRQGGBTDPI9IKgU9CEzdPY6YNy-vm8-M0hbc';
const supabase = createClient('https://qpmewfobfnbprlnfgayh.supabase.co', SERVICE_ROLE_KEY);

const USER_ID = '29022849-f9d3-4f5e-8f8a-2c203c8b4699';

async function createRecurringTasksGoal() {
  try {
    console.log('Creating "Recurring Tasks" goal...');

    // Create the goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: USER_ID,
        title: '🔁 Recurring Tasks',
        description: 'Daily and weekly recurring tasks that reset automatically',
        rag_status: 'green'
      })
      .select()
      .single();

    if (goalError) throw goalError;

    console.log('✅ Created goal:', goal.title);

    // Create "Daily Tasks" stage
    const { data: dailyStage, error: dailyStageError } = await supabase
      .from('stages')
      .insert({
        goal_id: goal.id,
        name: 'Daily Tasks',
        order_index: 0
      })
      .select()
      .single();

    if (dailyStageError) throw dailyStageError;

    // Create "Weekly Tasks" stage
    const { data: weeklyStage, error: weeklyStageError } = await supabase
      .from('stages')
      .insert({
        goal_id: goal.id,
        name: 'Weekly Tasks',
        order_index: 1
      })
      .select()
      .single();

    if (weeklyStageError) throw weeklyStageError;

    console.log('✅ Created stages: Daily Tasks, Weekly Tasks');

    // Add some example daily tasks
    const dailyTasks = [
      { text: 'Morning exercise', category: 'habit' },
      { text: 'Review daily goals', category: 'action' },
      { text: 'Read for 30 minutes', category: 'habit' }
    ];

    for (let i = 0; i < dailyTasks.length; i++) {
      const { error } = await supabase
        .from('tasks')
        .insert({
          stage_id: dailyStage.id,
          text: dailyTasks[i].text,
          category: dailyTasks[i].category,
          completed: false,
          order_index: i,
          streak: 0
        });

      if (error) throw error;
    }

    // Add some example weekly tasks
    const weeklyTasks = [
      { text: 'Weekly review (Sunday)', category: 'action' },
      { text: 'Plan week ahead (Monday)', category: 'action' },
      { text: 'Team sync notes (Friday)', category: 'collaboration' }
    ];

    for (let i = 0; i < weeklyTasks.length; i++) {
      const { error } = await supabase
        .from('tasks')
        .insert({
          stage_id: weeklyStage.id,
          text: weeklyTasks[i].text,
          category: weeklyTasks[i].category,
          completed: false,
          order_index: i,
          streak: 0
        });

      if (error) throw error;
    }

    console.log('✅ Added example daily and weekly tasks');
    console.log('\n🎉 Recurring Tasks goal created successfully!');
    console.log('Goal ID:', goal.id);
    console.log('\nRefresh purpoise.netlify.app to see your new Recurring Tasks goal');

  } catch (error) {
    console.error('Error:', error);
  }
}

createRecurringTasksGoal();
