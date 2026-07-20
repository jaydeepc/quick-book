# quick-book

**Quick Block** — a mobile-first calendar slot-blocking app for Piramal Finance.

An admin creates an event with available dates & time slots, then shares one link per
group (e.g. per SLT). Invitees open the link — no sign-in — tap the dates and times
that work for them, and leave their name. The admin sees every group's preferences
ranked by votes and downloads a PDF so a PA can block the calendars.

## Features

- 📱 Mobile-first, light theme, Piramal Finance branding
- 🔐 Password-protected admin (JWT session cookie)
- 🗓️ Clickable calendar for picking dates; per-date time slots
- 🔗 One share link per group — responses stay segregated per SLT
- 🙋 Public booking page with multi-date + multi-time selection, name only
- 🏆 Live "best times" ranking with vote counts per slot
- 📄 One-tap PDF availability report (branded, per-group breakdown)
- 🎨 Illustrations generated with GPT Image 2 (via Higgsfield)

## Stack

Next.js (App Router, TypeScript, Tailwind v4) · MongoDB Atlas · jsPDF · Vercel

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

### Environment variables

| Variable         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `MONGODB_URI`    | MongoDB connection string                |
| `ADMIN_PASSWORD` | Password for the admin sign-in           |
| `AUTH_SECRET`    | Random hex string used to sign sessions  |

## Deploy

Deployed on Vercel: https://quick-block.vercel.app
