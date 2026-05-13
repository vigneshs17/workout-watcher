# Multi-tenant rollout plan

Working reference for converting workout-watcher from single-user to multi-tenant.

## Decisions

| Area | Decision |
|---|---|
| Auth | Google OAuth (Google Identity Services on frontend → backend verifies ID token with `google-auth-library`) |
| Token transport | Bearer JWT in `localStorage` (NOT httpOnly cookies — Netlify + Render are cross-site, third-party cookies are unreliable) |
| Signup | Self-serve. Gated by `users.is_active` flag (default `false`). |
| Payment (v1) | None in app. Manual (Venmo/invoice), then run `activate-user.js <email>` CLI to flip `is_active=true`. Revisit Stripe (recurring subscription) once 3+ paying users exist. |
| HAE ingest | Per-user 32-byte hex sync token sent in `x-sync-token` header. Backend maps token → `user_id` on `/api/sync` and `/api/workouts` POSTs. Inactive users get 402. |
| Migration | Existing workouts backfilled to `user_id=1` (admin). Workouts PK becomes composite `(user_id, id)`. |
| Admin account | `vignesh1722@gmail.com` — seeded with `is_active=true, is_admin=true`, `sync_token` = existing `SYNC_TOKEN` env var so current HAE automation keeps working without reconfiguration. |
| Notifications | Optional `NEW_SIGNUP_WEBHOOK_URL` env var — backend POSTs `{email, name}` to it on first signup. |

## Schema

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  google_sub  TEXT UNIQUE,             -- nullable: backfilled on first OAuth login for the seed admin row
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  sync_token  TEXT UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed admin (vignesh1722@gmail.com) with existing SYNC_TOKEN
INSERT INTO users (email, sync_token, is_active, is_admin)
VALUES ('vignesh1722@gmail.com', :existing_sync_token, true, true);

ALTER TABLE workouts ADD COLUMN user_id INT REFERENCES users(id);
UPDATE workouts SET user_id = 1;
ALTER TABLE workouts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE workouts DROP CONSTRAINT workouts_pkey;
ALTER TABLE workouts ADD PRIMARY KEY (user_id, id);
CREATE INDEX workouts_user_start_idx ON workouts (user_id, start_date DESC);
```

`google_sub` is nullable so the admin row can be seeded before first OAuth login. On `POST /api/auth/google`, the upsert logic looks up by `google_sub` OR by `email` — if found by email but `google_sub` is null, it sets `google_sub`.

## Backend changes (`backend/`)

**New deps**: `jsonwebtoken`, `google-auth-library`

**New env vars**: `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `FRONTEND_ORIGIN` (also tighten CORS to this), optionally `NEW_SIGNUP_WEBHOOK_URL`. Drop `SYNC_TOKEN` after migration (it lives on the admin user row now).

**New routes**:
- `POST /api/auth/google` — verify ID token, upsert user, return `{ jwt }`.
- `GET /api/me` (requires JWT) — returns `{ email, name, is_active, is_admin, sync_token }`.

**Middleware**:
- `requireUser` — reads `Authorization: Bearer <jwt>`, attaches `req.user`, 401 if missing/invalid. Applied to all dashboard GET endpoints.
- `requireActiveSyncToken` — replaces `authMiddleware` on `POST /api/sync` and `POST /api/workouts`. Reads `x-sync-token`, looks up user, returns 402 if `!is_active`, attaches `req.user`.

**db.js**: every function takes `userId` and filters/inserts by it. PK collision concern resolved by composite PK.

**CLI**: `backend/scripts/activate-user.js <email>` — `UPDATE users SET is_active=true WHERE email=$1`.

## Frontend changes (`frontend/`)

**New deps**: `@react-oauth/google` (+ a router; current app has none — use `react-router-dom` or hand-roll).

**Auth context**: provides `{ user, jwt, login, logout }`. `jwt` persisted to `localStorage`. Fetch wrapper adds `Authorization: Bearer <jwt>` and redirects to `/login` on 401.

**Routes**:
- `/login` — public. Google sign-in button → POSTs ID token to `/api/auth/google` → stores JWT → redirects to `/`.
- `/` — protected. Existing dashboard, but uses authed fetches. If `is_active=false`, shows the "pending payment" screen instead.
- `/account` — protected. Shows email, `sync_token` (copyable), activation status.

## Pre-implementation chores (owner)

- [ ] Create Google Cloud OAuth Client ID (Web app type). Add Netlify origin to "Authorized JavaScript origins". Provide `GOOGLE_CLIENT_ID`.
- [ ] Set `JWT_SECRET` (any long random string) and `FRONTEND_ORIGIN` in Render env.
- [ ] Write payment-instruction copy for the pending-activation screen (Venmo handle? email? what to tell them?).

## Rollout order

1. **Schema migration + temp shim** ← *currently here*
   - Write Node migration script that creates `users`, seeds admin row from `SYNC_TOKEN` env, adds `user_id` to `workouts`, backfills, locks down PK.
   - Update `db.js` to hardcode `user_id=1` everywhere as a temporary shim — dashboard keeps working.
   - Run script against Render Postgres, verify dashboard.
2. **Backend Google verify + JWT + `/api/me`**.
3. **Make `db.js` queries truly user-scoped**; remove the hardcoded shim.
4. **Scope `/api/sync` by `x-sync-token`**; verify HAE automation still flows in with the admin token.
5. **Frontend login + protected routes + account page + pending-payment screen**.
6. **`activate-user.js` CLI**; smoke-test by creating a second test Google account, signing up, flipping the flag.

## Open follow-ups

- Set up a second Google account for end-to-end testing of the inactive-user flow.
- Decide on rate limiting for `/api/auth/google` (optional, low-priority for MVP).
