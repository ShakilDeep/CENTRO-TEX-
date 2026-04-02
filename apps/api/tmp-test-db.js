const Database = require('better-sqlite3');
try {
  const db = new Database(':memory:');
  console.log('Successfully opened in-memory database');
  db.close();
} catch (err) {
  console.error('Failed to load better-sqlite3:', err);
}
