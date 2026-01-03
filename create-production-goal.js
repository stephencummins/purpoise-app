const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createProductionGoal() {
  try {
    console.log('Checking production database for existing users...\n');

    // Get all goals to see what user IDs exist
    const { data: existingGoals, error: goalsError } = await supabase
      .from('goals')
      .select('user_id, title')
      .limit(10);

    if (goalsError && goalsError.code !== 'PGRST116') {
      console.error('Error checking goals:', goalsError.message);
      console.log('\n⚠️  Unable to access production database.');
      console.log('Please provide your user ID from the production app.');
      console.log('\nTo find your user ID:');
      console.log('1. Open the browser console on your production app');
      console.log('2. Run: localStorage.getItem("supabase.auth.token")');
      console.log('3. Look for the "user.id" field in the output\n');
      process.exit(1);
    }

    if (existingGoals && existingGoals.length > 0) {
      console.log('Found existing goals. Using the same user ID...');
      const userId = existingGoals[0].user_id;
      console.log('User ID:', userId, '\n');

      // Create the goal
      await createGoal(userId);
    } else {
      console.log('No existing goals found.');
      console.log('\n📋 Please sign in to your production app first, then run this script again.');
      console.log('Or provide your user ID as an environment variable:');
      console.log('USER_ID=your-user-id node create-production-goal.js\n');

      // Check if USER_ID is provided
      if (process.env.USER_ID) {
        console.log('Using USER_ID from environment...');
        await createGoal(process.env.USER_ID);
      } else {
        process.exit(1);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function createGoal(userId) {
  console.log('Creating West Leigh Council Election Campaign goal...\n');

  const goalData = {
    user_id: userId,
    title: 'West Leigh Council Election Campaign',
    description: 'Win the council elections for the West Leigh Ward.',
    rag_status: 'green',
  };

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert(goalData)
    .select()
    .single();

  if (goalError) throw new Error('Goal creation failed: ' + goalError.message);
  console.log('✓ Goal created:', goal.title);

  // Create stage
  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .insert({
      goal_id: goal.id,
      name: 'January Campaign',
      order_index: 0,
    })
    .select()
    .single();

  if (stageError) throw new Error('Stage creation failed: ' + stageError.message);
  console.log('✓ Stage created:', stage.name);

  // Create tasks
  const tasks = [
    { text: 'Get content for Leigh leaflet', category: 'work', due_date: '2026-01-16', order_index: 0 },
    { text: 'Layout Leigh leaflet in Affinity', category: 'work', due_date: '2026-01-16', order_index: 1 },
    { text: 'Get Leigh leaflet approved', category: 'collaboration', due_date: '2026-01-16', order_index: 2 },
    { text: 'Get Leigh leaflet printed', category: 'action', due_date: '2026-01-30', order_index: 3 },
    { text: 'Distribute Leigh leaflet', category: 'action', due_date: '2026-01-30', order_index: 4 },
  ].map(t => ({ ...t, stage_id: stage.id, completed: false, streak: 0 }));

  const { error: tasksError } = await supabase
    .from('tasks')
    .insert(tasks);

  if (tasksError) throw new Error('Tasks creation failed: ' + tasksError.message);
  console.log('✓ 5 tasks created\n');

  console.log('🎉 West Leigh Council Election Campaign created successfully!');
  console.log('\n📋 Summary:');
  console.log('- Title: West Leigh Council Election Campaign');
  console.log('- Stage: January Campaign');
  console.log('- Tasks: 5 (3 due 16/01/2026, 2 due 30/01/2026)');
  console.log('\nRefresh your production app to see the goal!');
}

createProductionGoal();
