const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Vanchow5378!@127.0.0.1:5432/bumdes'
});

async function testLogin() {
  const testEmail = 'admin@bumdes.id';
  const testPassword = 'admin123';

  try {
    console.log('Testing login for:', testEmail);
    console.log('Password:', testPassword);
    console.log('');

    // Get user from database
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [testEmail]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database!');
      console.log('Available users:');
      const allUsers = await pool.query('SELECT email FROM users');
      allUsers.rows.forEach(u => console.log('  -', u.email));
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.name, '(' + user.email + ')');
    console.log('Role:', user.role);
    console.log('Password hash exists:', user.password_hash ? 'Yes' : 'No');
    console.log('');

    // Test password
    const isValid = await bcrypt.compare(testPassword, user.password_hash);

    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('');
      console.log('Login should work with:');
      console.log('  Email:', testEmail);
      console.log('  Password:', testPassword);
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('');
      console.log('The password hash in database does not match "' + testPassword + '"');
      console.log('You may need to reset the password.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();
