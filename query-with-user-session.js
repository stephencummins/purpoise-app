// Query database with user session context
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qpmewfobfnbprlnfgayh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU',
  {
    auth: {
      persistSession: false
    }
  }
);

// Set the user session from localStorage
const accessToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjliSWIrUWpsbnZaNVF0dUYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FwbWV3Zm9iZm5icHJsbmZnYXloLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYTMyYWU4Mi1mMzUyLTQwM2ItODIyZS02ZDI5YzFkMzU1YzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYyOTgyNjM5LCJpYXQiOjE3NjI5NzkwMzksImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnt9LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJhbm9ueW1vdXMiLCJ0aW1lc3RhbXAiOjE3NjI4OTg1NDl9XSwic2Vzc2lvbl9pZCI6ImZkOTRhYjRjLTdiYjItNGM3ZC1hZGFmLTA1YWI0NDMzYWZiNSIsImlzX2Fub255bW91cyI6dHJ1ZX0.x5quO1lstSBOemIbic-7X2QGsmTYSAXdajqaa7K8mXk';
const refreshToken = 'tfg5h3chueqs';

async function queryWithSession() {
  try {
    // Set the session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }

    console.log('Session set for user:', sessionData.user.id);

    // Now query goals with this user's context
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*');

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    } else {
      console.log(`\nFound ${goals.length} goals:`);
      goals.forEach(goal => {
        console.log(`  - ${goal.title} (user: ${goal.user_id})`);
      });

      // Export to JSON
      const fs = require('fs');

      const fullGoals = [];
      for (const goal of goals) {
        const { data: stages } = await supabase
          .from('stages')
          .select('*')
          .eq('goal_id', goal.id)
          .order('order_index');

        const stagesWithTasks = [];
        for (const stage of stages || []) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('stage_id', stage.id)
            .order('order_index');

          stagesWithTasks.push({ ...stage, tasks: tasks || [] });
        }

        fullGoals.push({ ...goal, stages: stagesWithTasks });
      }

      fs.writeFileSync('goals-backup.json', JSON.stringify(fullGoals, null, 2));
      console.log('\n✅ Goals exported to goals-backup.json');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

queryWithSession();
