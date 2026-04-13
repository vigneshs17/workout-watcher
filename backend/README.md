# Workout Backend

Receives workout data from Scriptable (Apple HealthKit) and serves it to a dashboard.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workouts` | Receive workouts from Scriptable |
| GET | `/api/summary` | Overall stats (totals, averages) |
| GET | `/api/workouts` | Raw workout list |
| GET | `/api/frequency?days=90` | Workouts per day |
| GET | `/api/duration?weeks=12` | Weekly duration totals |
| GET | `/api/calories?weeks=12` | Weekly calorie totals |
| GET | `/api/types` | Breakdown by workout type |
| GET | `/health` | Health check |

## Deploy to Render (Free Tier)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create workout-backend --public --push
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` automatically and sets everything up
5. Wait ~2 minutes for the deploy to finish
6. Your backend URL will be: `https://workout-backend.onrender.com`

### 3. Get your Sync Token
1. In Render dashboard → your service → **Environment**
2. Copy the value of `SYNC_TOKEN`
3. Paste it into the Scriptable script as the token header

## Update Scriptable Script

After deploying, update these two lines in your Scriptable script:

```javascript
const WEBHOOK_URL = "https://workout-backend.onrender.com/api/workouts";
const SYNC_TOKEN  = "your-token-from-render-dashboard";
```

And update the POST headers:
```javascript
req.headers = {
  "Content-Type": "application/json",
  "x-sync-token": SYNC_TOKEN,
};
```

## Run Locally

```bash
npm install
npm run dev   # uses nodemon for auto-reload
```

Server starts on http://localhost:3000
