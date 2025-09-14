const fs = require('fs');
const pool = require('./config/db.js'); // il pool già configurato con process.env.DATABASE_URL

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // PostgreSQL non permette query multiple in un singolo query() 
  // quindi dividiamo in comandi separati
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0);

  for (const cmd of commands) {
    await pool.query(cmd);
  }
  console.log(`Eseguito: ${filePath}`);
}

async function main() {
  try {
    await runSqlFile('src/backend/seed_data.sql');
    console.log('Database popolato!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
