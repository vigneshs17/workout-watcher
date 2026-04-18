const express = require("express");
const cors = require("cors");
const {
  initDb,
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

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Optional: simple token auth (set SYNC_TOKEN env var to enable)
function authMiddleware(req, res, next) {
  const token = process.env.SYNC_TOKEN;
  if (!token) return next();

  const provided = req.headers["x-sync-token"] || req.query.token;
  if (provided !== token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Webhook: receive workouts from Scriptable ──────────────────
app.post("/api/workouts", authMiddleware, async (req, res) => {
  const { workouts, synced_at } = req.body;

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return res.status(400).json({ error: "No workouts in payload" });
  }

  try {
    await upsertMany(workouts, synced_at || new Date().toISOString());
    console.log(`[${new Date().toISOString()}] Synced ${workouts.length} workouts`);
    res.json({ status: "ok", synced: workouts.length });
  } catch (err) {
    console.error("Sync error:", err.message);
    res.status(500).json({ error: "Failed to save workouts" });
  }
});

// ── Dashboard API endpoints ────────────────────────────────────

app.get("/api/summary", async (req, res) => {
  try {
    res.json(await getSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/workouts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    res.json(await getAllWorkouts(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/frequency", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    res.json(await getFrequency(days));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/duration", async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    res.json(await getWeeklyDuration(weeks));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/calories", async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    res.json(await getWeeklyCalories(weeks));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/types", async (req, res) => {
  try {
    res.json(await getTypeBreakdown());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Workout backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  });
