const { query } = require('./src/config/db');
async function checkTable() {
  try {
    const result = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_naams'");
    console.log('user_naams columns:', result.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
checkTable();