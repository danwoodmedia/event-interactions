import { supabase } from './lib/supabase.js';

/**
 * Check if the admin user exists and has correct role
 */
async function checkAdminUser() {
  try {
    console.log('Checking admin user...\n');

    // List all users (requires service role key)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error.message);
      return;
    }

    console.log(`Total users: ${users.length}\n`);

    // Find admin user
    const adminUser = users.find(u => u.email === 'admin@example.com');

    if (adminUser) {
      console.log('✓ Admin user found:');
      console.log('  ID:', adminUser.id);
      console.log('  Email:', adminUser.email);
      console.log('  Email confirmed:', adminUser.email_confirmed_at ? 'Yes' : 'No');
      console.log('  Created:', new Date(adminUser.created_at).toLocaleString());
      console.log('  User metadata:', JSON.stringify(adminUser.user_metadata, null, 2));
      console.log('  Role:', adminUser.user_metadata?.role || 'NOT SET');
    } else {
      console.log('✗ Admin user not found');
    }

    console.log('\nAll users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (role: ${user.user_metadata?.role || 'none'})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAdminUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
