const express = require("express");
const cors    = require("cors");
const jwt     = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const {
  initDb,
  upsertMany,
  getAllWorkouts,
  getFrequency,
  getWeeklyDuration,
  getWeeklyCalories,
  getTypeBreakdown,
  getSummary,
  findOrCreateUser,
  getUserById,
  getUserBySyncToken,
} = require("./db");

const app          = express();
const PORT         = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Auth helpers ───────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Protects dashboard GET endpoints — reads Bearer JWT, attaches req.user
function requireUser(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Protects ingest endpoints — reads x-sync-token, attaches req.syncUser
async function requireActiveSyncToken(req, res, next) {
  const token = req.headers["x-sync-token"] || req.query.token;
  if (!token) return res.status(401).json({ error: "Missing sync token" });

  try {
    const user = await getUserBySyncToken(token);
    if (!user) return res.status(401).json({ error: "Invalid sync token" });
    if (!user.is_active) return res.status(402).json({ error: "Account not activated" });
    req.syncUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Auth routes ────────────────────────────────────────────────
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name } = ticket.getPayload();
    const user = await findOrCreateUser(sub, email, name);

    if (!user.is_active && process.env.NEW_SIGNUP_WEBHOOK_URL) {
      fetch(process.env.NEW_SIGNUP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      }).catch(() => {});
    }

    res.json({ jwt: signToken(user) });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Invalid credential" });
  }
});

app.get("/api/me", requireUser, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      email:      user.email,
      name:       user.name,
      is_active:  user.is_active,
      is_admin:   user.is_admin,
      sync_token: user.sync_token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Webhook: receive workouts from Scriptable ──────────────────
app.post("/api/workouts", requireActiveSyncToken, async (req, res) => {
  const { workouts, synced_at } = req.body;
  if (!Array.isArray(workouts) || workouts.length === 0) {
    return res.status(400).json({ error: "No workouts in payload" });
  }
  try {
    await upsertMany(workouts, synced_at || new Date().toISOString(), req.syncUser.id);
    console.log(`[${new Date().toISOString()}] Synced ${workouts.length} workouts for user ${req.syncUser.id}`);
    res.json({ status: "ok", synced: workouts.length });
  } catch (err) {
    console.error("Sync error:", err.message);
    res.status(500).json({ error: "Failed to save workouts" });
  }
});

// ── Health Auto Export sync endpoint ──────────────────────────
function parseHAEDate(str) {
  const m = str.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})/);
  if (!m) return new Date(str).toISOString();
  const [, date, time, h, min] = m;
  return new Date(`${date}T${time}${h}:${min}`).toISOString();
}

function transformHAEWorkout(w) {
  return {
    id:              w.id,
    type:            w.name,
    startDate:       parseHAEDate(w.start),
    endDate:         parseHAEDate(w.end),
    durationMinutes: Math.round((w.duration / 60) * 10) / 10,
    calories:        w.activeEnergyBurned ? Math.round(w.activeEnergyBurned.qty / 4.184) : null,
    distanceKm:      w.distance ? Math.round(w.distance.qty * 100) / 100 : null,
    heartRate:       null,
    source:          w.activeEnergy?.[0]?.source ?? "Apple Watch",
  };
}

app.post("/api/sync", requireActiveSyncToken, async (req, res) => {
  const raw = req.body?.data?.workouts;
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: "No workouts in payload" });
  }
  try {
    const workouts = raw.map(transformHAEWorkout);
    await upsertMany(workouts, new Date().toISOString(), req.syncUser.id);
    console.log(`[${new Date().toISOString()}] HAE sync: ${workouts.length} workouts for user ${req.syncUser.id}`);
    res.json({ status: "ok", synced: workouts.length });
  } catch (err) {
    console.error("HAE sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard API endpoints ────────────────────────────────────
app.get("/api/summary", requireUser, async (req, res) => {
  try { res.json(await getSummary(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/workouts", requireUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    res.json(await getAllWorkouts(limit, req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/frequency", requireUser, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    res.json(await getFrequency(days, req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/duration", requireUser, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    res.json(await getWeeklyDuration(weeks, req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/calories", requireUser, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    res.json(await getWeeklyCalories(weeks, req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/types", requireUser, async (req, res) => {
  try { res.json(await getTypeBreakdown(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Debug ──────────────────────────────────────────────────────
let lastDebugPayload = null;
app.post("/api/debug", (req, res) => {
  lastDebugPayload = req.body;
  console.log("DEBUG payload:", JSON.stringify(req.body, null, 2));
  res.json({ status: "ok" });
});
app.get("/api/debug", (req, res) => {
  res.json(lastDebugPayload || { message: "No payload received yet" });
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
