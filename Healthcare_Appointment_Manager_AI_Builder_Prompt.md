# Build Prompt: Healthcare Appointment & Follow-up Manager

Build a full-stack healthcare appointment platform with three role-based portals (Patient, Doctor, Admin). Follow the exact specifications below — do not substitute equivalent technologies unless a listed one is genuinely unavailable in your environment, and note any substitution clearly.

## Project Summary

A clinic appointment system where:
- Admin creates and manages doctor profiles (specialisation, working hours, slot duration, leave days)
- Patients register, search doctors by specialisation, and book appointment slots
- Patients submit a symptom form before the visit; an LLM generates a structured pre-visit summary (urgency level, chief complaint, suggested questions) for the doctor
- Doctors submit post-visit clinical notes and a prescription; an LLM converts this into a patient-friendly post-visit summary with a medication schedule
- The system prevents double-booking under concurrent requests, handles doctor leave conflicts by cancelling and notifying affected patients, and sends email + Google Calendar notifications for booking, reminders, and cancellations
- Medication reminders are sent automatically based on prescription frequency

## Tech Stack (required)

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Standalone Node.js API service (Express or Fastify) — do NOT merge this into Next.js API routes; it must be a separately deployable service
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT (access + refresh token pair), bcrypt password hashing, role-based middleware (`PATIENT` / `DOCTOR` / `ADMIN`)
- **LLM**: Anthropic API or OpenAI API, called server-side only, never exposed to the client
- **Email**: Resend or SendGrid
- **Calendar**: Google Calendar API v3 with OAuth 2.0 (per-user consent, scope limited to `calendar.events`)
- **Background jobs**: BullMQ + Redis, for reminders and notification retries
- **Hosting**: Frontend on Vercel; backend + worker on Render or Railway; Postgres on Neon or Supabase; Redis on Upstash (all free-tier)

## Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  role          Role
  name          String
  phone         String?
  createdAt     DateTime @default(now())

  patientProfile PatientProfile?
  doctorProfile  DoctorProfile?
  googleAuth     GoogleAuth?
}

enum Role { PATIENT DOCTOR ADMIN }

model DoctorProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  specialisation  String
  slotDurationMin Int      @default(20)
  workingHours    Json     // { mon: ["09:00-13:00","14:00-17:00"], tue: [...] }
  leaves          DoctorLeave[]
  appointments    Appointment[]
}

model DoctorLeave {
  id        String   @id @default(uuid())
  doctorId  String
  doctor    DoctorProfile @relation(fields: [doctorId], references: [id])
  date      DateTime
  reason    String?
  createdAt DateTime @default(now())

  @@index([doctorId, date])
}

model PatientProfile {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  dob          DateTime?
  appointments Appointment[]
}

model Appointment {
  id                    String   @id @default(uuid())
  doctorId              String
  doctor                DoctorProfile @relation(fields: [doctorId], references: [id])
  patientId             String
  patient               PatientProfile @relation(fields: [patientId], references: [id])
  slotStart             DateTime
  slotEnd               DateTime
  status                AppointmentStatus @default(HELD)
  holdExpiresAt         DateTime?
  symptomForm           Json?
  preVisitSummary       Json?
  postVisitNotes        String?
  postVisitSummary      Json?
  prescription          Json?
  googleEventIdPatient  String?
  googleEventIdDoctor   String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([doctorId, slotStart])
}

enum AppointmentStatus { HELD CONFIRMED CANCELLED COMPLETED NO_SHOW }

model GoogleAuth {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String   // encrypt at rest (AES-256, key from env)
  accessToken  String?
  expiresAt    DateTime?
}

model NotificationLog {
  id            String   @id @default(uuid())
  appointmentId String?
  type          String   // BOOKING_CONFIRM, REMINDER, CANCELLATION, MED_REMINDER
  channel       String   // EMAIL, CALENDAR
  status        String   // PENDING, SENT, FAILED
  attempts      Int      @default(0)
  lastError     String?
  createdAt     DateTime @default(now())
}
```

**Critical requirement**: the `@@unique([doctorId, slotStart])` constraint is the primary mechanism for preventing double-booking. Do not implement double-booking prevention via a "check availability, then insert" pattern in application code — that has a race condition under concurrent requests. Booking must be a single `INSERT` inside a transaction that relies on this constraint to reject conflicts; catch the unique-violation error (Postgres code `23505`) and return HTTP 409.

## Core Business Logic Requirements

### 1. Slot generation
Do not store empty/available slots as rows. Compute available slots on request by taking the doctor's `workingHours` for that day of week, subtracting `slotDurationMin`-sized increments already covered by existing `Appointment` rows (status `HELD` or `CONFIRMED`), and excluding any date present in `DoctorLeave`.

### 2. Slot hold mechanism
Booking is two steps:
1. `POST /appointments/hold` — creates an `Appointment` row with `status = HELD` and `holdExpiresAt = now() + 5 minutes`. This is the row that trips the unique constraint if another request tries the same slot.
2. `POST /appointments/:id/confirm` — patient submits the symptom form; if `holdExpiresAt` has not passed, flip status to `CONFIRMED`, trigger the pre-visit LLM summary, and enqueue booking-confirmation notifications. If the hold has expired, return 410 and require a new hold.

Run a recurring background job (every 1 minute) that deletes `HELD` rows past `holdExpiresAt`, freeing the slot.

### 3. Doctor leave conflict handling
When an admin creates a `DoctorLeave` for a date that has existing `HELD` or `CONFIRMED` appointments:
1. Inside a single transaction: create the leave record, and set all affected appointments to `status = CANCELLED`.
2. After the transaction commits, enqueue a `CANCELLATION` notification job (email + Google Calendar event deletion) for each affected patient.
3. The cancellation email should include a link back to that doctor's next available slots.

### 4. Notification reliability
Every email send and every Google Calendar create/update/delete must go through a background job queue (BullMQ) — never called synchronously inside an HTTP request handler. Requirements:
- Write a `NotificationLog` row before attempting a job, update it (`SENT`/`FAILED`, `attempts`, `lastError`) after.
- Retry policy: 3 attempts, exponential backoff starting at 5 seconds.
- Deduplicate using `appointmentId + type` as an idempotency key so retries never send duplicate notifications.
- Expose a way (admin API endpoint or dashboard view) to list all `FAILED` notifications after exhausting retries.

### 5. LLM integration
Two LLM calls, both server-side, both must request strict JSON output and validate the parsed shape before saving:

**Pre-visit summary** (triggered on appointment confirm):
```
Analyse these symptoms and return ONLY valid JSON with keys:
urgency ("Low" | "Medium" | "High"), chiefComplaint (string),
questions (array of exactly 3 strings — suggested questions for the doctor to ask).
Symptoms: <symptoms>
```

**Post-visit summary** (triggered when doctor submits notes + prescription):
```
Convert these clinical notes into a patient-friendly summary. Return ONLY valid JSON with keys:
summary (string, plain language), medicationSchedule (array of {drug, dose, timing}),
followUpSteps (array of strings).
Notes: <notes>
```

Failure handling requirement: wrap every LLM call with an 8-second timeout. On timeout, parse failure, or API error, do NOT block the booking/visit flow. Save a fallback object (e.g. `{ urgency: "UNKNOWN", chiefComplaint: <raw symptoms truncated>, questions: [], generationFailed: true }`) and let the frontend render a "AI summary unavailable — raw input below" state. Log the failure but return success to the calling flow.

### 6. Medication reminders
When a post-visit prescription is saved, parse each medication's `frequency` and `days`, and schedule the corresponding number of reminder jobs via BullMQ (e.g. "twice daily for 5 days" → 10 scheduled sends). Each firing sends an email and logs a `NotificationLog` row with `type = MED_REMINDER`.

### 7. Google Calendar integration
- Implement OAuth 2.0 authorization-code flow per user (not a service account) with scope `https://www.googleapis.com/auth/calendar.events`.
- Store the refresh token encrypted (AES-256) in `GoogleAuth`.
- On appointment confirm: create a calendar event for the patient and the doctor (if each has connected their calendar), store the returned event IDs on the `Appointment` row.
- On cancellation/reschedule: update or delete the corresponding calendar events using the stored IDs.
- If a user has not connected Google Calendar, skip calendar actions silently — do not block or fail the booking flow.

## Required API Endpoints

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

# Admin
POST   /admin/doctors
PATCH  /admin/doctors/:id
POST   /admin/doctors/:id/leave
GET    /admin/notifications/failed

# Patient
GET    /doctors?specialisation=
GET    /doctors/:id/slots?date=
POST   /appointments/hold
POST   /appointments/:id/confirm
DELETE /appointments/:id
GET    /appointments/me

# Doctor
GET    /doctor/appointments?date=
GET    /doctor/appointments/:id
POST   /doctor/appointments/:id/notes

# Google OAuth
GET    /google/auth-url
GET    /google/callback
```

## Repository Structure

```
/backend
  /src
    /modules        (auth, doctors, appointments, notifications, llm, calendar)
    /jobs           (reminders.worker.ts, notifications.worker.ts)
    /prisma         (schema.prisma, migrations/, seed.ts)
  .env.example
/frontend
  /app
    /patient        (role-guarded route group)
    /doctor
    /admin
README.md
SYSTEM_DESIGN.md
docker-compose.yml    (local Postgres + Redis for development)
```

## Deliverables

1. Complete, runnable source code (backend + frontend + worker), organized per the structure above
2. `README.md` containing: setup instructions, `.env.example` with all required variables, API documentation, the database schema, the exact LLM prompts used, and step-by-step Google Calendar/OAuth setup instructions
3. A working hosted deployment (frontend + backend + worker + database all reachable)
4. `SYSTEM_DESIGN.md`, max 800 words, covering exactly these four topics: double-booking prevention, doctor leave conflict handling, the slot hold mechanism, and notification failure handling

## Build Order

1. Prisma schema, migrations, and a seed script (1 admin, 2 doctors, 3 patients with realistic working hours)
2. Auth: registration, login, JWT issuing/refresh, role-based middleware
3. Slot generation logic as a pure, unit-testable function — verify it correctly excludes leave days and already-booked slots before building anything on top of it
4. Booking flow: hold → symptom form → confirm, with a concurrency test that fires two simultaneous hold requests for the same slot and asserts only one succeeds
5. LLM service module, built behind an interface so the provider can be swapped and failure paths can be tested without real API calls
6. Email service and templates (booking confirmation, reminder, cancellation, medication reminder)
7. Google OAuth flow and calendar event CRUD
8. BullMQ worker: hold-expiry cleanup, notification retries, medication reminder scheduling
9. Frontend, in this order: patient portal, doctor portal, admin portal
10. Deploy, then finalize README.md and SYSTEM_DESIGN.md against the actual final behavior

## Non-negotiable Constraints

- Double-booking prevention must rely on a database unique constraint plus a transaction, not application-level "check then insert" logic.
- No notification (email or calendar) may be sent synchronously inside a request handler — all go through the background job queue.
- No LLM call may block or fail the appointment/visit flow — every call has a timeout and a fallback path.
- LLM API keys and Google OAuth secrets must never be exposed to the frontend.
