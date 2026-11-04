# fpronix — Football Stats & Predictions Platform

> Real-time football statistics, algorithmic + AI-powered predictions, and a verified tipster community — built for French-speaking football fans in Africa and Europe.

**Live:** [fpronix.com](https://fpronix.com)

---

## Overview

fpronix syncs fixtures, results and live scores for 280+ matches a day, computes statistical predictions (1X2, Over/Under, BTTS), and adds AI-generated match analysis. Users can build optimized betting tickets, follow tipsters ranked by their *real* success rate, and upgrade to a premium plan paid by Mobile Money or card.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access + refresh tokens), Google OAuth, WebAuthn |
| AI | Anthropic Claude API |
| Data | API-Football, The Odds API |
| Payments | PayTech (Wave, Orange Money, MTN, Moov, Free Money, card) |
| DevOps | Docker Compose, GitHub Actions CI, Nginx, PM2, Let's Encrypt |
| Tests | Jest |

## Features

**Matches & data**
- Automatic fixture sync (scheduled cron + live sync every 30 min)
- Lineups, head-to-head and injuries loaded on demand
- League standings, league comparator, advanced filters

**Predictions**
- Statistical model for 1X2, Over/Under and BTTS, grouped by confidence
- Optimized ticket generator (market, confidence, matchday filters) with PNG export
- Combos, odds alerts and a virtual wallet to simulate bets

**AI agents (Claude)**
- Per-match analysis (form, H2H, injuries) with a daily quota per user
- Content agent (social posts), SEO agent (match page meta), weekly tipster report

**Community**
- User tips, follow/unfollow, comments
- Tipster leaderboard based on verified success rate and weekly ROI

**Accounts & payments**
- Sign-up / login, email verification, password reset, Google sign-in
- FREE / PREMIUM plans, payment webhooks, simulation mode for development

**Admin & platform**
- Admin dashboard (users, payments, matches, competitions), AI agents console, moderation
- Push notifications (VAPID), dynamic SEO, dark mode, mobile-first responsive UI
- Maintenance mode and automated database backups

## Architecture

```
Browser ──► Nginx ──┬── /api/*  ──► Node.js / Express (PM2) ──► PostgreSQL
                    └── /*      ──► React build (static)
```

```
.
├── backend/     # Express API, Prisma schema & migrations, Jest tests
├── frontend/    # React + Vite app
├── deploy/      # Server setup, Nginx config, deploy & backup scripts
└── docker-compose.yml
```

## Getting Started

**Prerequisites:** Node.js 18+, PostgreSQL 14+ (or Docker).

```bash
git clone https://github.com/Mulho-MABIALA/pronix-.git
cd pronix-
```

**Backend**
```bash
cd backend
cp .env.example .env        # then fill in your own values
npm install
npx prisma migrate dev
npx prisma db seed          # creates plans, competitions and an admin account
npm run dev
```

> Set `SEED_ADMIN_PASSWORD` before seeding to choose the admin password; otherwise a random one is generated and printed in the console.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Or with Docker**
```bash
cp .env.example .env
docker compose up --build
```

## Environment Variables

All secrets are read from environment variables — see `.env.example`. Main keys:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing |
| `FOOTBALL_API_KEY` | API-Football access |
| `ANTHROPIC_API_KEY` | AI analysis |
| `ODDS_API_KEY` | Bookmaker odds |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `PAYTECH_API_KEY`, `PAYTECH_API_SECRET` | Payments |
| `SMTP_*` | Transactional email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push |

## Tests

```bash
cd backend
npm test
```

## Roadmap

- [ ] Android app (Play Store)
- [ ] Referral program
- [ ] Advanced stats (xG, heatmaps)

## Author

**Ibrahim-Trésor MABIALA-MULHO** — Full Stack Developer, Zolaa Tech (Dakar, Senegal)
Portfolio: [mulho-folio.vercel.app](https://mulho-folio.vercel.app) · GitHub: [@Mulho-MABIALA](https://github.com/Mulho-MABIALA)
