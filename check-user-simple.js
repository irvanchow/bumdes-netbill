const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Vanchow5378!@127.0.0.1:5432/bumdes'
});

pool.query('SELECT id, name, email, role FROM users')
  .then(result => {
    console.log('Users:', result.rows.length);
    result.rows.forEach(u => console.log(' -', u.email));
    pool.end();
  })
  .catch(err => {
    console.log('Error:', err.message);
    pool.end();
  });
