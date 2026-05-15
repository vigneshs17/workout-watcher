#!/usr/bin/env node
/*
 * Activate a user account after payment is received.
 *
 * Usage:
 *   DATABASE_URL='...' node backend/scripts/activate-user.js user@example.com
 */

const { Pool } = require("pg");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node activate-user.js <email>");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function run() {
  const res = await pool.query(
    `UPDATE users SET is_active = true WHERE lower(email) = lower($1) RETURNING id, email, sync_token`,
    [email]
  );

  if (res.rowCount === 0) {
    console.error(`No user found with email: ${email}`);
    process.exitCode = 1;
  } else {
    const u = res.rows[0];
    console.log(`✔ Activated user ${u.email} (id=${u.id})`);
    console.log(`  Sync token: ${u.sync_token}`);
    console.log(`  Set this as x-sync-token in their HAE automation.`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
  pool.end();
});
