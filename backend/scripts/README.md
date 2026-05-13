# Backend scripts

## 001-add-multitenant-schema.js

One-shot migration that converts the single-tenant workouts table to multi-tenant.

**What it does**
- Creates the `users` table.
- Seeds an admin row for `ADMIN_EMAIL` using your existing `SYNC_TOKEN` as its `sync_token`, so the current HAE automation continues to work without reconfiguration. `google_sub` is left null and gets backfilled the first time the admin signs in with Google.
- Adds `user_id` to `workouts`, backfills every existing row to the admin, sets `NOT NULL`, and switches the primary key to `(user_id, id)`.
- Adds a `(user_id, start_date DESC)` index.

The script is idempotent — running it twice is a no-op.

## Run it against Render Postgres

1. **Grab the External Database URL** from Render dashboard → your Postgres → *Connections* → *External Database URL*. (External, not Internal — you're connecting from your laptop.)
2. **Grab your current `SYNC_TOKEN`** from Render dashboard → your backend service → *Environment*.
3. From the repo root:
   ```bash
   cd backend
   npm install   # only needed once
   DATABASE_URL='postgres://...external-url...' \
   SYNC_TOKEN='your-current-sync-token' \
   ADMIN_EMAIL='vignesh1722@gmail.com' \
     node scripts/001-add-multitenant-schema.js
   ```
4. Expected output ends with `✔ Migration complete.`
5. **Right after the migration**, push the code change in this PR so the backend uses the new `user_id`-aware `db.js`. There may be a 30–60s window where the old deployed code tries to insert without `user_id` and fails — HAE will retry on its next run, so no data is lost.

## Verifying

After the migration runs and the new code is deployed:

- Hit the dashboard — it should look identical (queries are temp-shimmed to `user_id=1`).
- Trigger an HAE sync — should succeed; new rows land with `user_id=1`.
- In psql: `SELECT id, email, is_active, is_admin FROM users;` → one row, your admin.
- In psql: `SELECT COUNT(*) FROM workouts WHERE user_id IS NULL;` → 0.

## Rollback

The migration runs in a single transaction, so a failure mid-way rolls everything back automatically. If you need to roll back after a successful run:

```sql
ALTER TABLE workouts DROP CONSTRAINT workouts_pkey;
ALTER TABLE workouts ADD PRIMARY KEY (id);
ALTER TABLE workouts DROP COLUMN user_id;
DROP INDEX IF EXISTS workouts_user_start_idx;
DROP TABLE users;
```

Do this *before* redeploying the new code, or the new code will fail to insert.
