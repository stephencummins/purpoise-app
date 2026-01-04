// Copy and paste this into the browser console on https://purpoise.netlify.app/
// while you're signed in

(async function createLeighGoals() {
  try {
    console.log('Creating Leigh Council Election Campaign goals...\n');

    // Load Supabase from CDN if not already loaded
    if (typeof supabase === 'undefined') {
      console.log('Loading Supabase library...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for module to initialize
    }

    // Get the Supabase client
    const { createClient } = supabase;
    const supabaseClient = createClient(
      'https://qpmewfobfnbprlnfgayh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU'
    );

    // Get current user
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) {
      console.error('❌ You must be signed in to create goals');
      return;
    }

    const userId = session.user.id;
    console.log('✓ Signed in as:', userId);

    // ===== CREATE LEIGH GOAL =====
    console.log('\n📋 Creating Leigh Council Election Campaign...');
    const { data: leighGoal, error: leighGoalError } = await supabaseClient
      .from('goals')
      .insert({
        user_id: userId,
        title: 'Leigh Council Election Campaign',
        description: 'Win the council elections for the Leigh Ward.',
        rag_status: 'green',
      })
      .select()
      .single();

    if (leighGoalError) throw leighGoalError;
    console.log('✓ Goal created:', leighGoal.title);

    // Create Leigh stage
    const { data: leighStage, error: leighStageError } = await supabaseClient
      .from('stages')
      .insert({
        goal_id: leighGoal.id,
        name: 'January Campaign',
        order_index: 0,
      })
      .select()
      .single();

    if (leighStageError) throw leighStageError;
    console.log('✓ Stage created:', leighStage.name);

    // Create Leigh tasks
    const leighTasks = [
      { text: 'Get content for Leigh leaflet', category: 'work', due_date: '2026-01-16', order_index: 0 },
      { text: 'Layout Leigh leaflet in Affinity', category: 'work', due_date: '2026-01-16', order_index: 1 },
      { text: 'Get Leigh leaflet approved', category: 'collaboration', due_date: '2026-01-16', order_index: 2 },
      { text: 'Get Leigh leaflet printed', category: 'action', due_date: '2026-01-30', order_index: 3 },
      { text: 'Distribute Leigh leaflet', category: 'action', due_date: '2026-01-30', order_index: 4 },
    ].map(t => ({ ...t, stage_id: leighStage.id, completed: false, streak: 0 }));

    const { error: leighTasksError } = await supabaseClient
      .from('tasks')
      .insert(leighTasks);

    if (leighTasksError) throw leighTasksError;
    console.log('✓ 5 tasks created');

    // ===== CREATE WEST LEIGH GOAL =====
    console.log('\n📋 Creating West Leigh Council Election Campaign...');
    const { data: westLeighGoal, error: westLeighGoalError } = await supabaseClient
      .from('goals')
      .insert({
        user_id: userId,
        title: 'West Leigh Council Election Campaign',
        description: 'Win the council elections for the West Leigh Ward.',
        rag_status: 'green',
      })
      .select()
      .single();

    if (westLeighGoalError) throw westLeighGoalError;
    console.log('✓ Goal created:', westLeighGoal.title);

    // Create West Leigh stage
    const { data: westLeighStage, error: westLeighStageError } = await supabaseClient
      .from('stages')
      .insert({
        goal_id: westLeighGoal.id,
        name: 'January Campaign',
        order_index: 0,
      })
      .select()
      .single();

    if (westLeighStageError) throw westLeighStageError;
    console.log('✓ Stage created:', westLeighStage.name);

    // Create West Leigh tasks
    const westLeighTasks = [
      { text: 'Get content for West Leigh leaflet', category: 'work', due_date: '2026-01-16', order_index: 0 },
      { text: 'Layout West Leigh leaflet in Affinity', category: 'work', due_date: '2026-01-16', order_index: 1 },
      { text: 'Get West Leigh leaflet approved', category: 'collaboration', due_date: '2026-01-16', order_index: 2 },
      { text: 'Get West Leigh leaflet printed', category: 'action', due_date: '2026-01-30', order_index: 3 },
      { text: 'Distribute West Leigh leaflet', category: 'action', due_date: '2026-01-30', order_index: 4 },
    ].map(t => ({ ...t, stage_id: westLeighStage.id, completed: false, streak: 0 }));

    const { error: westLeighTasksError } = await supabaseClient
      .from('tasks')
      .insert(westLeighTasks);

    if (westLeighTasksError) throw westLeighTasksError;
    console.log('✓ 5 tasks created');

    console.log('\n🎉 Both Leigh Council Election Campaigns created successfully!');
    console.log('   - Leigh Ward');
    console.log('   - West Leigh Ward');
    console.log('\nRefresh the page to see your new goals!');

    // Refresh the page
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
})();
