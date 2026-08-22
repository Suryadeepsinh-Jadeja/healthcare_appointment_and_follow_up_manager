# Healthcare Appointment & Follow-up Manager

A clinic appointment platform with separate Patient, Doctor, and Admin portals: slot
booking with race-safe holds, doctor leave conflict handling, AI-generated pre-visit and
post-visit summaries, and email + Google Calendar notifications.

> Work in progress — full setup instructions, API docs, database schema, LLM prompts, and
> Google Calendar setup steps will be documented here as the build completes.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js (Express) + TypeScript, standalone API service
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + refresh), bcrypt, role-based middleware
- **LLM**: Google Gemini (Flash-Lite), server-side only
- **Email**: Resend
- **Calendar**: Google Calendar API v3 (OAuth 2.0)
- **Background jobs**: BullMQ + Redis

## Local development

Requires Docker (or local Postgres + Redis).

```bash
docker compose up -d
cd backend && npm install && cp .env.example .env
npm run prisma:migrate
npm run seed
npm run dev
```

```bash
cd frontend && npm install && cp .env.example .env.local
npm run dev
```
