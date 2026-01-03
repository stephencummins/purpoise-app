// Copy and paste this into the browser console on https://purpoise.netlify.app/
// while you're signed in to get your user ID

(async function getUserId() {
  try {
    const { createClient } = supabaseJs;
    const supabase = createClient(
      'https://qpmewfobfnbprlnfgayh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWV3Zm9iZm5icHJsbmZnYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMxNDIsImV4cCI6MjA3ODQ0OTE0Mn0.ynHs4CmCwf9s-vkPHzn4khddshQU530Pz6MJI-iIxIU'
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('❌ You must be signed in');
      return;
    }

    console.log('✓ Your User ID:', session.user.id);
    console.log('\nTo create the Leigh goals, run:');
    console.log(`node create-leigh-goals.js ${session.user.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
