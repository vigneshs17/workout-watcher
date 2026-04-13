const express = require("express");
const cors = require("cors");
const {
  upsertMany,
  getAllWorkouts,
  getFrequency,
  getWeeklyDuration,
  getWeeklyCalories,
  getTypeBreakdown,
  getSummary,
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Optional: simple token auth (set SYNC_TOKEN env var to enable)
function authMiddleware(req, res, next) {
  const token = process.env.SYNC_TOKEN;
  if (!token) return next(); // auth disabled if no token set

  const provided = req.headers["x-sync-token"] || req.query.token;
  if (provided !== token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Webhook: receive workouts from Scriptable ──────────────────
app.post("/api/workouts", authMiddleware, (req, res) => {
  const { workouts, synced_at } = req.body;

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return res.status(400).json({ error: "No workouts in payload" });
  }

  try {
    upsertMany(workouts, synced_at || new Date().toISOString());
    console.log(`[${new Date().toISOString()}] Synced ${workouts.length} workouts`);
    res.json({ status: "ok", synced: workouts.length });
  } catch (err) {
    console.error("Sync error:", err.message);
    res.status(500).json({ error: "Failed to save workouts" });
  }
});

// ── Dashboard API endpoints ────────────────────────────────────

// GET /api/summary — overall stats
app.get("/api/summary", (req, res) => {
  res.json(getSummary());
});

// GET /api/workouts — raw list (last 200)
app.get("/api/workouts", (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  res.json(getAllWorkouts(limit));
});

// GET /api/frequency?days=90 — workouts per day
app.get("/api/frequency", (req, res) => {
  const days = parseInt(req.query.days) || 90;
  res.json(getFrequency(days));
});

// GET /api/duration?weeks=12 — weekly duration totals
app.get("/api/duration", (req, res) => {
  const weeks = parseInt(req.query.weeks) || 12;
  res.json(getWeeklyDuration(weeks));
});

// GET /api/calories?weeks=12 — weekly calorie totals
app.get("/api/calories", (req, res) => {
  const weeks = parseInt(req.query.weeks) || 12;
  res.json(getWeeklyCalories(weeks));
});

// GET /api/types — breakdown by workout type
app.get("/api/types", (req, res) => {
  res.json(getTypeBreakdown());
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Workout backend running on port ${PORT}`);
});
