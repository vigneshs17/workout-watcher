#!/usr/bin/env node
/*
 * Migration 001: convert single-tenant workouts table to multi-tenant.
 *
 *  - Creates `users` table.
 *  - Seeds admin row for ADMIN_EMAIL using SYNC_TOKEN as its sync_token,
 *    so the existing HAE automation keeps working without reconfiguration.
 *  - Adds `user_id` to `workouts`, backfills all existing rows to the
 *    admin user, and switches the primary key to (user_id, id).
 *
 * Required env vars:
 *   DATABASE_URL  - Postgres connection string (same as the app uses)
 *   SYNC_TOKEN    - the current global sync token (becomes the admin's per-user token)
 *   ADMIN_EMAIL   - the admin's Google email (default: vignesh1722@gmail.com)
 *
 * Idempotent: re-running after a successful run is a no-op.
 *
 * Usage:
 *   DATABASE_URL=... SYNC_TOKEN=... node backend/scripts/001-add-multitenant-schema.js
 */

const { Pool } = require("pg");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "vignesh1722@gmail.com";
const SYNC_TOKEN = process.env.SYNC_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is required");
  process.exit(1);
}
if (!SYNC_TOKEN) {
  console.error("ERROR: SYNC_TOKEN is required (the existing global token, used as the admin's per-user token)");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("→ Creating users table (if not exists)...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        google_sub  TEXT UNIQUE,
        email       TEXT UNIQUE NOT NULL,
        name        TEXT,
        sync_token  TEXT UNIQUE NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT false,
        is_admin    BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    console.log(`→ Seeding admin row for ${ADMIN_EMAIL}...`);
    const seedRes = await client.query(
      `INSERT INTO users (email, sync_token, is_active, is_admin)
       VALUES ($1, $2, true, true)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [ADMIN_EMAIL, SYNC_TOKEN]
    );
    const adminId =
      seedRes.rows[0]?.id ??
      (await client.query(`SELECT id FROM users WHERE email = $1`, [ADMIN_EMAIL])).rows[0].id;
    console.log(`   admin user_id = ${adminId}`);

    const colCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
       WHERE table_name = 'workouts' AND column_name = 'user_id'
    `);

    if (colCheck.rowCount === 0) {
      console.log("→ Adding user_id column to workouts...");
      await client.query(`ALTER TABLE workouts ADD COLUMN user_id INT REFERENCES users(id)`);

      console.log(`→ Backfilling existing workouts to user_id = ${adminId}...`);
      const backfill = await client.query(`UPDATE workouts SET user_id = $1 WHERE user_id IS NULL`, [adminId]);
      console.log(`   backfilled ${backfill.rowCount} rows`);

      console.log("→ Setting user_id NOT NULL...");
      await client.query(`ALTER TABLE workouts ALTER COLUMN user_id SET NOT NULL`);
    } else {
      console.log("→ user_id column already exists, skipping add/backfill");
    }

    const pkCheck = await client.query(`
      SELECT array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) AS cols
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
       WHERE c.conrelid = 'workouts'::regclass AND c.contype = 'p'
    `);
    const pkCols = pkCheck.rows[0]?.cols || [];
    const alreadyComposite = pkCols.length === 2 && pkCols.includes("user_id") && pkCols.includes("id");

    if (!alreadyComposite) {
      console.log(`→ Swapping primary key (current: ${pkCols.join(", ") || "<none>"}) to (user_id, id)...`);
      await client.query(`ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_pkey`);
      await client.query(`ALTER TABLE workouts ADD PRIMARY KEY (user_id, id)`);
    } else {
      console.log("→ Composite PK (user_id, id) already in place, skipping");
    }

    console.log("→ Ensuring (user_id, start_date DESC) index...");
    await client.query(`CREATE INDEX IF NOT EXISTS workouts_user_start_idx ON workouts (user_id, start_date DESC)`);

    await client.query("COMMIT");
    console.log("\n✔ Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n✘ Migration failed, rolled back:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
