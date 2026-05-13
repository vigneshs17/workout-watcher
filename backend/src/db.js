const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// TEMP shim — every query is parameterized on userId, but defaults to the admin
// user so existing server.js callers keep working until step 3 of the
// multi-tenant rollout, where each route will pass req.user.id explicitly.
const DEFAULT_USER_ID = 1;

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      id               TEXT NOT NULL,
      type             TEXT NOT NULL,
      start_date       TEXT NOT NULL,
      end_date         TEXT NOT NULL,
      duration_minutes REAL,
      calories         REAL,
      distance_km      REAL,
      hr_avg           INTEGER,
      hr_max           INTEGER,
      hr_min           INTEGER,
      source           TEXT,
      synced_at        TEXT,
      created_at       TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `);
}

async function upsertMany(workouts, syncedAt, userId = DEFAULT_USER_ID) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const w of workouts) {
      await client.query(
        `INSERT INTO workouts (
          user_id, id, type, start_date, end_date, duration_minutes,
          calories, distance_km, hr_avg, hr_max, hr_min, source, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT(user_id, id) DO UPDATE SET
          duration_minutes = EXCLUDED.duration_minutes,
          calories         = EXCLUDED.calories,
          distance_km      = EXCLUDED.distance_km,
          hr_avg           = EXCLUDED.hr_avg,
          hr_max           = EXCLUDED.hr_max,
          hr_min           = EXCLUDED.hr_min,
          synced_at        = EXCLUDED.synced_at`,
        [
          userId,
          w.id, w.type, w.startDate, w.endDate, w.durationMinutes ?? null,
          w.calories ?? null, w.distanceKm ?? null,
          w.heartRate?.avg ?? null, w.heartRate?.max ?? null, w.heartRate?.min ?? null,
          w.source ?? "Apple Watch", syncedAt,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getAllWorkouts(limit = 200, userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT * FROM workouts WHERE user_id = $1 ORDER BY start_date DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getFrequency(days = 90, userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT date(start_date) AS day, COUNT(*) AS count
     FROM workouts
     WHERE user_id = $1
       AND start_date >= to_char(now() - ($2 * INTERVAL '1 day'), 'YYYY-MM-DD')
     GROUP BY day
     ORDER BY day ASC`,
    [userId, days]
  );
  return rows;
}

async function getWeeklyDuration(weeks = 12, userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT
       to_char(start_date::timestamp, 'IYYY-"W"IW') AS week,
       ROUND(SUM(duration_minutes)::numeric, 1)     AS total_minutes,
       COUNT(*)                                      AS workout_count
     FROM workouts
     WHERE user_id = $1
       AND start_date >= to_char(now() - ($2 * INTERVAL '1 day'), 'YYYY-MM-DD')
     GROUP BY week
     ORDER BY week ASC`,
    [userId, weeks * 7]
  );
  return rows;
}

async function getWeeklyCalories(weeks = 12, userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT
       to_char(start_date::timestamp, 'IYYY-"W"IW') AS week,
       ROUND(SUM(calories)::numeric, 0)              AS total_calories,
       COUNT(*)                                       AS workout_count
     FROM workouts
     WHERE user_id = $1
       AND start_date >= to_char(now() - ($2 * INTERVAL '1 day'), 'YYYY-MM-DD')
     GROUP BY week
     ORDER BY week ASC`,
    [userId, weeks * 7]
  );
  return rows;
}

async function getTypeBreakdown(userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT
       type,
       COUNT(*)                                       AS count,
       ROUND(SUM(duration_minutes)::numeric, 1)       AS total_minutes,
       ROUND(AVG(duration_minutes)::numeric, 1)       AS avg_minutes,
       ROUND(SUM(calories)::numeric, 0)               AS total_calories
     FROM workouts
     WHERE user_id = $1
     GROUP BY type
     ORDER BY count DESC`,
    [userId]
  );
  return rows;
}

async function getSummary(userId = DEFAULT_USER_ID) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                       AS total_workouts,
       ROUND(SUM(duration_minutes)::numeric, 1)       AS total_minutes,
       ROUND(AVG(duration_minutes)::numeric, 1)       AS avg_duration,
       ROUND(SUM(calories)::numeric, 0)               AS total_calories,
       ROUND(AVG(calories)::numeric, 0)               AS avg_calories,
       MIN(date(start_date))                          AS first_workout,
       MAX(date(start_date))                          AS last_workout
     FROM workouts
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

module.exports = {
  initDb,
  upsertMany,
  getAllWorkouts,
  getFrequency,
  getWeeklyDuration,
  getWeeklyCalories,
  getTypeBreakdown,
  getSummary,
};
