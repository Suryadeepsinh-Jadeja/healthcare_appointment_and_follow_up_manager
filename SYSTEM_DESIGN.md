# System Design

## Double-booking prevention

The mechanism is a single database constraint: `@@unique([doctorId, slotStart])` on the
`Appointment` table. Booking is a single `INSERT` (`prisma.appointment.create`) that
relies on Postgres to reject a conflicting row — there is no "check if the slot is free,
then insert" step anywhere in the code path. That pattern is explicitly avoided because
it has a race window: two concurrent requests can both read "free" before either writes,
and both then insert, producing a double-booking. A unique constraint has no such
window — Postgres serializes the two `INSERT`s and the second fails deterministically,
regardless of timing.

When the insert fails, Postgres returns SQLSTATE `23505` (unique violation), which Prisma
surfaces as `PrismaClientKnownRequestError` with code `P2002`. The hold handler catches
that code specifically and returns HTTP 409. Everything else (bad specialisation, a slot
outside working hours) is validated *before* the insert via the pure slot-generation
function, but explicitly without checking current bookings — that check is left to the
constraint alone, so there's exactly one source of truth for "is this slot taken." An
automated test (`tests/booking-concurrency.test.ts`) fires two simultaneous holds for the
same slot against a real Postgres instance and asserts exactly one succeeds.

One consequence of keying the constraint on the row's mere existence, not its status: a
`CANCELLED` row would still occupy that `(doctorId, slotStart)` pair and block anyone
from ever booking it again. Patient-initiated cancellation therefore deletes the row
outright rather than soft-cancelling it, which both matches the `DELETE` verb and
reopens the slot immediately. Doctor-leave-driven cancellations are different: they set
`status = CANCELLED` and keep the row, which is safe there because the whole day is
already excluded from availability by the leave record itself, independent of any
specific row.

## Slot hold mechanism

Booking is two steps because the LLM call and symptom form shouldn't tie up a slot
indefinitely if the patient abandons the flow, nor need to share a transaction with the
reservation itself. `POST /appointments/hold` creates the row with `status = HELD` and
`holdExpiresAt = now() + 5 minutes` — this is the
row that trips the unique constraint for anyone else. `POST /appointments/:id/confirm`
then checks `holdExpiresAt`: if it's still in the future, the patient's symptom form is
saved, the pre-visit LLM summary is generated, status flips to `CONFIRMED`, and
`holdExpiresAt` is cleared. If it has already passed, the row is deleted immediately (so
the slot is available again without waiting for the cleanup sweep) and the client gets
410, prompting a fresh hold.

Because nothing proactively expires a hold, a BullMQ repeatable job runs every 60 seconds
and deletes any `HELD` row past its `holdExpiresAt`, covering a patient who closes the
tab mid-flow and never triggers the confirm-time deletion.

## Doctor leave conflict handling

When an admin creates a `DoctorLeave` for a date with existing bookings, the leave record
and the cancellation of every affected `HELD`/`CONFIRMED` appointment happen inside one
Prisma transaction — either both succeed or neither does, so a crash mid-operation can
never leave the leave record without its cancellations, or vice versa. Notification jobs
are enqueued only *after* that transaction commits, using data captured while the
transaction still had the appointment rows in hand (patient
email, doctor name, slot time, prior Google Calendar event IDs) — enqueuing beforehand
risks notifying about a leave that then fails to commit. Only appointments that were
`CONFIRMED` get a notification; a `HELD` appointment never had confirmation-stage
notifications or calendar events created in the first place, so there's nothing to
reverse. Each cancellation email links back to that doctor's next available slots.

## Notification failure handling

No email or calendar call ever runs synchronously in a request handler. Every send is a
BullMQ job with 3 attempts and exponential backoff starting at 5 seconds. A
`NotificationLog` row is created before the job is enqueued and updated to `SENT` or
`FAILED` (with `attempts` and `lastError`) after each attempt; `GET
/admin/notifications/failed` surfaces everything that exhausted retries. Two failure
modes are handled distinctly. First, the send itself failing (bad API key, recipient
issue) is caught by the worker and recorded on the log row — expected, retried,
eventually visible as `FAILED`. Second, *enqueuing* the job failing (e.g. a bad job ID, a
Redis hiccup) is caught separately at the call site and marks the already-created log row
`FAILED` immediately, so a queue-level failure can't leave a row silently stuck at
`PENDING` forever with no job left to ever update it. In both cases, and for every call
site that triggers a notification (confirm, cancel, leave), the surrounding business
operation has already committed by the time notifications are attempted — a notification
failure is logged and never turns an already-successful booking, cancellation, or leave
into a failed HTTP response.
