const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '..', 'data', 'irongate_dw.db');
const db = new Database(DB_PATH, { readonly: false, fileMustExist: true });

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`IronGate Insights connected to warehouse: ${DB_PATH}`);
module.exports = db;
