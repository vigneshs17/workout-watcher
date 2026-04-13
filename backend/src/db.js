const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../workouts.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create workouts table
db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    duration_minutes  REAL,
    calories    REAL,
    distance_km REAL,
    hr_avg      INTEGER,
    hr_max      INTEGER,
    hr_min      INTEGER,
    source      TEXT,
    synced_at   TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// Upsert a single workout
const upsertWorkout = db.prepare(`
  INSERT INTO workouts (
    id, type, start_date, end_date, duration_minutes,
    calories, distance_km, hr_avg, hr_max, hr_min, source, synced_at
  ) VALUES (
    @id, @type, @start_date, @end_date, @duration_minutes,
    @calories, @distance_km, @hr_avg, @hr_max, @hr_min, @source, @synced_at
  )
  ON CONFLICT(id) DO UPDATE SET
    duration_minutes = excluded.duration_minutes,
    calories         = excluded.calories,
    distance_km      = excluded.distance_km,
    hr_avg           = excluded.hr_avg,
    hr_max           = excluded.hr_max,
    hr_min           = excluded.hr_min,
    synced_at        = excluded.synced_at
`);

// Bulk upsert wrapped in a transaction
const upsertMany = db.transaction((workouts, syncedAt) => {
  for (const w of workouts) {
    upsertWorkout.run({
      id:               w.id,
      type:             w.type,
      start_date:       w.startDate,
      end_date:         w.endDate,
      duration_minutes: w.durationMinutes ?? null,
      calories:         w.calories ?? null,
      distance_km:      w.distanceKm ?? null,
      hr_avg:           w.heartRate?.avg ?? null,
      hr_max:           w.heartRate?.max ?? null,
      hr_min:           w.heartRate?.min ?? null,
      source:           w.source ?? "Apple Watch",
      synced_at:        syncedAt,
    });
  }
});

// ── Query helpers ──────────────────────────────────────────────

function getAllWorkouts(limit = 200) {
  return db
    .prepare(
      `SELECT * FROM workouts ORDER BY start_date DESC LIMIT ?`
    )
    .all(limit);
}

// Frequency: number of workouts per day (last N days)
function getFrequency(days = 90) {
  return db
    .prepare(
      `SELECT date(start_date) AS day, COUNT(*) AS count
       FROM workouts
       WHERE start_date >= date('now', '-' || ? || ' days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(days);
}

// Weekly duration totals
function getWeeklyDuration(weeks = 12) {
  return db
    .prepare(
      `SELECT
         strftime('%Y-W%W', start_date) AS week,
         ROUND(SUM(duration_minutes), 1) AS total_minutes,
         COUNT(*) AS workout_count
       FROM workouts
       WHERE start_date >= date('now', '-' || ? || ' days')
       GROUP BY week
       ORDER BY week ASC`
    )
    .all(weeks * 7);
}

// Weekly calories totals
function getWeeklyCalories(weeks = 12) {
  return db
    .prepare(
      `SELECT
         strftime('%Y-W%W', start_date) AS week,
         ROUND(SUM(calories), 0) AS total_calories,
         COUNT(*) AS workout_count
       FROM workouts
       WHERE start_date >= date('now', '-' || ? || ' days')
       GROUP BY week
       ORDER BY week ASC`
    )
    .all(weeks * 7);
}

// Breakdown by workout type
function getTypeBreakdown() {
  return db
    .prepare(
      `SELECT
         type,
         COUNT(*)                       AS count,
         ROUND(SUM(duration_minutes),1) AS total_minutes,
         ROUND(AVG(duration_minutes),1) AS avg_minutes,
         ROUND(SUM(calories),0)         AS total_calories
       FROM workouts
       GROUP BY type
       ORDER BY count DESC`
    )
    .all();
}

// Summary stats (all time)
function getSummary() {
  return db
    .prepare(
      `SELECT
         COUNT(*)                        AS total_workouts,
         ROUND(SUM(duration_minutes),1)  AS total_minutes,
         ROUND(AVG(duration_minutes),1)  AS avg_duration,
         ROUND(SUM(calories),0)          AS total_calories,
         ROUND(AVG(calories),0)          AS avg_calories,
         MIN(date(start_date))           AS first_workout,
         MAX(date(start_date))           AS last_workout
       FROM workouts`
    )
    .get();
}

module.exports = {
  upsertMany,
  getAllWorkouts,
  getFrequency,
  getWeeklyDuration,
  getWeeklyCalories,
  getTypeBreakdown,
  getSummary,
};
