# Healthcare Appointment & Follow-up Manager

A clinic appointment platform with separate Patient, Doctor, and Admin portals: slot
booking with race-safe holds, doctor leave conflict handling, AI-generated pre-visit and
post-visit summaries, and email + Google Calendar notifications.

## Live deployment

- **App**: https://healthcare-appointment-and-follow-u.vercel.app
- **API**: https://healthcare-backend-riou.onrender.com

Seeded accounts (password for all: `Password123!`):

| Role    | Email                        |
| ------- | ----------------------------- |
| Admin   | `admin@clinic.test`           |
| Doctor  | `dr.mehta@clinic.test`        |
| Doctor  | `dr.rao@clinic.test`          |
| Patient | `asha.patient@clinic.test`    |
| Patient | `rohan.patient@clinic.test`   |
| Patient | `meera.patient@clinic.test`   |

Notes on the live deployment:

- The backend is on Render's free tier, which spins down after inactivity — the first
  request after idle can take up to ~50 seconds while it wakes up.
- Email is on Resend's free/sandbox tier without a verified domain, so it can only
  actually deliver to the account owner's own signup address. Emails to any other
  address (including the seeded `@clinic.test` patients) will queue, retry three times,
  and land in `FAILED` — that's expected sandbox behavior, not a bug. Verifying a real
  domain in Resend removes this restriction.
- The Google Calendar OAuth app is in Google's "Testing" publishing status, so only
  Google accounts added as test users in the OAuth consent screen can complete the
  connect flow.

## Tech stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js (Express) + TypeScript, standalone API service
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + refresh), bcrypt, role-based middleware
- **LLM**: Google Gemini (`gemini-2.5-flash-lite` by default), server-side only
- **Email**: Resend
- **Calendar**: Google Calendar API v3 (OAuth 2.0, authorization-code flow)
- **Background jobs**: BullMQ + Redis

Two deliberate substitutions from a stricter reading of the original spec, both noted
here as instructed:

- **LLM provider**: Gemini instead of Anthropic/OpenAI. The LLM module is written behind
  a provider interface (`LlmProvider`, `src/modules/llm/llm.types.ts`), so swapping
  providers is a one-file change.
- **Worker deployment**: the BullMQ workers run in the same process as the API server by
  default (`RUN_WORKER_INLINE=true`), because Render's free tier has no separate
  background-worker resource type. Set `RUN_WORKER_INLINE=false` and run
  `npm run worker:start` as its own process on any platform/plan that does offer one.

## Local development

Requires Docker (for local Postgres + Redis), or Postgres 16 and Redis installed
directly (e.g. via Homebrew: `brew install postgresql@16 redis`).

```bash
docker compose up -d
```

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in the values below
npm run prisma:migrate
npm run seed
npm run dev             # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

### Tests

```bash
cd backend
npm test
```

Includes unit tests for the slot-generation function and an integration test that fires
two truly concurrent hold requests for the same slot against a real Postgres instance and
asserts exactly one succeeds — the double-booking-prevention mechanism described in
[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings, must differ from each other |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (defaults: `15m`, `7d`) |
| `REDIS_URL` | Redis connection string (use `rediss://` for TLS-required providers like Upstash) |
| `GEMINI_API_KEY` | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash-lite` |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `EMAIL_FROM` | Sender address, e.g. `Clinic <onboarding@resend.dev>` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From a Google Cloud OAuth client (see below) |
| `GOOGLE_REDIRECT_URI` | `<backend-url>/google/callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | 32-byte hex key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | Used for CORS and post-OAuth redirects |
| `RUN_WORKER_INLINE` | `true` (default) runs BullMQ workers in-process; `false` expects a separate `npm run worker:start` process |

### Frontend (`frontend/.env.local`)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL |

## Google Calendar setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Calendar API** (search for it, click Enable)
3. Configure the **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: External
   - Add scope `.../auth/calendar.events`
   - Add any Google accounts that need to test the connect flow as **test users** (the
     app stays in "Testing" status — publishing would require Google's verification
     process for this sensitive scope, which is unnecessary here)
4. Create an **OAuth client ID** (APIs & Services → Credentials → Create Credentials →
   OAuth client ID):
   - Application type: Web application
   - Authorized redirect URI: `<backend-url>/google/callback` (add both the local
     `http://localhost:4000/google/callback` and the deployed backend's URL)
5. Copy the Client ID and Client Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

Users connect their calendar from the app's **Settings** page (patient or doctor nav).
Refresh tokens are encrypted at rest (AES-256-GCM) using `GOOGLE_TOKEN_ENCRYPTION_KEY`.

## Database schema

See [backend/prisma/schema.prisma](backend/prisma/schema.prisma) for the full Prisma
schema. Core models: `User` (with `Role`: `PATIENT` / `DOCTOR` / `ADMIN`),
`DoctorProfile`, `DoctorLeave`, `PatientProfile`, `Appointment` (with
`AppointmentStatus`: `HELD` / `CONFIRMED` / `CANCELLED` / `COMPLETED` / `NO_SHOW`),
`GoogleAuth`, `NotificationLog`. The `Appointment.@@unique([doctorId, slotStart])`
constraint is the load-bearing piece of the double-booking prevention design — see
[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

## LLM prompts

Both calls are server-side only, request strict JSON output, run behind an 8-second
timeout, and fall back to a `generationFailed: true` object (never blocking the booking
or visit flow) on any timeout, parse failure, or API error.

**Pre-visit summary** (`src/modules/llm/preVisitSummary.ts`), triggered on appointment
confirm:

```
Analyse these symptoms and return ONLY valid JSON with keys:
urgency ("Low" | "Medium" | "High"), chiefComplaint (string),
questions (array of exactly 3 strings — suggested questions for the doctor to ask).
Symptoms: <symptoms>
```

**Post-visit summary** (`src/modules/llm/postVisitSummary.ts`), triggered when a doctor
submits visit notes:

```
Convert these clinical notes into a patient-friendly summary. Return ONLY valid JSON with keys:
summary (string, plain language), medicationSchedule (array of {drug, dose, timing}),
followUpSteps (array of strings).
Notes: <notes>
```

## API reference

All routes except `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, and
`/google/callback` require `Authorization: Bearer <accessToken>`. Role restrictions in
parentheses.

```
GET    /health

POST   /auth/register              (creates a PATIENT account)
POST   /auth/login
POST   /auth/refresh
GET    /auth/me

GET    /doctors?specialisation=      (PATIENT, ADMIN)
GET    /doctors/:id/slots?date=      (PATIENT)

POST   /appointments/hold            (PATIENT)
POST   /appointments/:id/confirm     (PATIENT)
DELETE /appointments/:id             (PATIENT)
GET    /appointments/me              (PATIENT)

GET    /doctor/appointments?date=    (DOCTOR)
GET    /doctor/appointments/:id      (DOCTOR)
POST   /doctor/appointments/:id/notes (DOCTOR)

POST   /admin/doctors                (ADMIN)
PATCH  /admin/doctors/:id            (ADMIN)
POST   /admin/doctors/:id/leave      (ADMIN)
GET    /admin/notifications/failed   (ADMIN)

GET    /google/status                (any authenticated user)
GET    /google/auth-url              (any authenticated user)
GET    /google/callback              (public — Google redirects here)
```

## Repository structure

```
/backend
  /src
    /modules        (auth, doctors, doctor, admin, appointments, notifications, llm, calendar)
    /jobs           (queues, notifications.worker.ts, reminders.worker.ts)
    /config, /lib, /middleware
    /prisma         (schema.prisma, migrations/, seed.ts)
  /tests
/frontend
  /app
    /patient, /doctor, /admin   (role-guarded route groups)
    /login, /register, /settings
  /lib              (api client, auth context, shared types)
  /components
README.md
SYSTEM_DESIGN.md
docker-compose.yml    (local Postgres + Redis for development)
render.yaml            (Render Blueprint for the backend)
```
