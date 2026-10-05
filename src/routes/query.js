// src/routes/query.js
// Ad-hoc SELECT query endpoint against the warehouse.
// Only single SELECT statements are allowed — no DDL/DML.

const express = require('express');
const db = require('../db');
const router = express.Router();

// Very strict allow-list: must start with SELECT or WITH, no semicolons except trailing
function isSafeSelect(sql) {
  const trimmed = sql.trim().replace(/;+\s*$/, ''); // strip trailing ;
  if (!/^\s*(select|with)\b/i.test(trimmed)) return false;
  if (/;\s*\S/.test(trimmed)) return false; // no multi-statement
  // Block obvious danger keywords even inside SELECT
  if (
    /\b(drop|delete|update|insert|alter|create|attach|detach|pragma|vacuum)\b/i.test(
      trimmed
    )
  )
    return false;
  return true;
}

router.post('/', (req, res) => {
  const { sql } = req.body || {};
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'Missing sql in request body' });
  }
  if (!isSafeSelect(sql)) {
    return res.status(400).json({
      error: 'Only single SELECT / WITH statements are allowed.',
    });
  }

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all();
    const columns = rows.length ? Object.keys(rows[0]) : [];
    res.json({
      columns,
      rows,
      rowCount: rows.length,
      sql: sql.trim(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
