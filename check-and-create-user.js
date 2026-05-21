const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Vanchow5378!@127.0.0.1:5432/bumdes'
});

async function checkAndCreateUser() {
  try {
    console.log('Checking database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!\n');

    // Check existing users
    const result = await pool.query('SELECT id, name, email, role FROM users');
    console.log('Users in database:', result.rows.length);

    if (result.rows.length > 0) {
      console.log('\nExisting users:');
      result.rows.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('\n⚠️  No users found! Creating default admin user...');

      // Create default admin user
      const passwordHash = await bcrypt.hash('admin123', 10);

      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Admin', 'admin@bumdes.id', passwordHash, 'admin']
      );

      console.log('✅ Default admin user created!');
      console.log('   Email: admin@bumdes.id');
      console.log('   Password: admin123');
      console.log('\n⚠️  Please change this password after first login!');
    }

    // Verify password hash exists
    const hashCheck = await pool.query('SELECT id, email, password_hash FROM users LIMIT 1');
    if (hashCheck.rows.length > 0) {
      console.log('\n✅ Password hash exists for user:', hashCheck.rows[0].email);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateUser();
