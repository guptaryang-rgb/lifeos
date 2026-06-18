# LifeOS — AI-Powered Life Operating System

> Your personal AI chief of staff. Manage tasks, nutrition, fitness, finances, habits, wellness, and more — all in one premium app.

![License](https://img.shields.io/badge/license-MIT-blue) ![Platform](https://img.shields.io/badge/platform-web%20%7C%20iOS%20%7C%20Android-brightgreen)

## Features

- 🤖 **AI Secretary** — 28+ natural language commands, Gemini API integration with offline NLP fallback
- 📸 **Food Photo Scanner** — Snap a photo and AI identifies food items with full nutritional data
- 🍎 **Nutrition Tracker** — 110-item food database, macro tracking, MET calorie burn estimation
- 💪 **Fitness Tracker** — Cardio & strength logging, workout history, calorie calculations
- 💰 **Finance Manager** — Budget tracking, 11 categories, analytics, recurring expense detection
- 🧘 **Wellness Suite** — Water, sleep, mood, meditation, journal, 48-article knowledge library
- 📚 **Study Tools** — Flashcards, quizzes, spaced repetition
- 🔐 **Security** — PIN lock, auto-lock, encrypted secure vault
- 📱 **Screen Time** — Tab tracking, productivity scoring, focus alerts
- 📅 **Smart Calendar** — Event scheduling, conflict detection, AI-powered suggestions
- 👑 **Premium** — Stripe-powered subscription with billing portal

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML/CSS/JS SPA |
| Backend API | Next.js 14 App Router |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini 2.0 Flash (chat + vision) |
| Auth | NextAuth.js + HMAC-SHA256 signed sessions |
| Payments | Stripe Checkout + Customer Portal |
| Mobile | CapacitorJS (iOS + Android) |
| PWA | Service Worker + Web App Manifest |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (optional — falls back to local JSON file DB)

### Installation
```bash
git clone <repo-url>
cd lifeos
npm install
cp .env.example .env  # Configure your environment variables
```

### Environment Variables
See `.env.example` for all required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for session signing
- `GEMINI_API_KEY` — Google AI API key (optional, enables AI features)
- `STRIPE_SECRET_KEY` — Stripe secret key (optional, enables payments)

### Development
```bash
# Start the static server (port 3000) with API proxy
node server.js

# In another terminal, start the Next.js API server (port 4000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Mobile Build
```bash
npm run build:mobile    # Build static assets into dist/
npx cap add ios         # Add iOS platform (requires Mac + Xcode)
npx cap add android     # Add Android platform (requires Android Studio)
npx cap sync            # Sync web assets to native projects
npx cap open ios        # Open in Xcode
npx cap open android    # Open in Android Studio
```

## Project Structure
```
lifeos/
├── index.html              # SPA shell (15 pages)
├── css/styles.css          # Design system (3000+ lines)
├── js/                     # Frontend modules
│   ├── app.js              # SPA router & coordination
│   ├── secretary.js        # AI NLP engine (84KB)
│   ├── food.js             # Nutrition & fitness
│   ├── finance.js          # Budget & analytics
│   ├── wellness.js         # Water/sleep/mood/journal/reads
│   ├── security.js         # PIN lock & vault
│   ├── capacitor-init.js   # Native bridge
│   └── ...                 # 7 more modules
├── src/                    # Next.js backend
│   ├── app/api/            # 15+ API routes
│   ├── lib/auth.ts         # HMAC session signing
│   ├── lib/prisma.ts       # DB proxy with offline fallback
│   ├── middleware.ts       # Rate limiting, CORS, CSP
│   └── ...
├── prisma/schema.prisma    # Database schema (13 models)
├── server.js               # Static server + API proxy
├── capacitor.config.json   # Mobile packaging config
└── tests/e2e/              # Playwright E2E tests
```

## Testing
```bash
# E2E: AI Secretary & Fitness
node tests/e2e/test_fitness_bot.js

# E2E: Cloud Sync & Premium
node tests/e2e/test_api_sync.js
```

## License
MIT
