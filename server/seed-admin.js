import { supabase } from './lib/supabase.js';

/**
 * Creates a default admin user for testing
 * Email: admin@example.com
 * Password: admin
 */
async function createAdminUser() {
  try {
    console.log('Creating default admin user...');

    // Create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@example.com',
      password: 'admin',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Admin User',
        role: 'producer' // Using producer role (can be upgraded to admin if needed)
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✓ Admin user already exists');
        return;
      }
      throw error;
    }

    console.log('✓ Admin user created successfully');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin');
    console.log('  Role: producer');
    console.log('  User ID:', data.user.id);
  } catch (err) {
    console.error('✗ Error creating admin user:', err.message);
    process.exit(1);
  }
}

// Run the seed
createAdminUser()
  .then(() => {
    console.log('\nSeed completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
