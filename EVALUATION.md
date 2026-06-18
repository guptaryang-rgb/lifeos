# LifeOS v2 — Evaluation & 10x Rebuild Plan

## TL;DR — Where Your Repo Is Today

Your current `lifeos` repo is an **ambitious scaffold**, not a product. The product spec (`ORIGINAL_REQUEST.md`) is genuinely great — but the code is two parallel stacks fighting each other:

| Layer | What you say | What you shipped |
|---|---|---|
| Frontend | "Vanilla HTML/CSS/JS SPA" in README | 1091-line monolithic `index.html` |
| UI | Next.js 14 App Router in PROJECT.md | `src/app/` is empty shells |
| Components | Tailwind + framer-motion + recharts in `package.json` | Never imported anywhere |
| Backend | Next.js API routes | Only a static file server `server.js` proxies to Next |
| Tests | Playwright suite planned in TEST_INFRA.md | `tests/e2e/` is empty |
| CI | `.github/workflows/` exists | No workflows defined |
| Auth | NextAuth + HMAC | Sidebar hardcoded "Alex Chen" |

So the experience is: a 52 KB vanilla HTML file fakes a 15-page app, while Next.js sits unused on the side.

## What I'm Doing Differently in v2

### 1. **One Stack, One Truth**
   - Pure vanilla SPA (no framework lock-in, instant preview, runs anywhere)
   - But **modular ES modules** — no more 1091-line files
   - Each page is its own module. Each UI primitive is its own file.

### 2. **Real Working Features (not mocks)**
   - Dashboard that **calculates** today's briefing from your real localStorage data
   - Calendar with **actual drag-and-drop** and conflict detection
   - AI Planner that **runs the heuristic scheduler** and gives you a real schedule
   - Pomodoro timer that **logs sessions** and updates your focus time
   - NLP secretary with **real regex + scoring**, no API required
   - Charts drawn with **custom SVG** (no library bloat)

### 3. **Distinct Visual Identity**
   - Inspired by aurora/cosmic gradients — not generic SaaS purple
   - Inter for UI, JetBrains Mono for data, custom variable font weights
   - Motion design system: spring physics on every interactive element
   - "Bioluminescent" cards: subtle radial glow + noise texture

### 4. **Production-Ready Patterns**
   - Event bus for cross-module comms (no spaghetti global vars)
   - Reactive store with pub/sub (no React, but same mental model)
   - Strict input validation on every "API"
   - localStorage as the database — fast, offline-first, no setup

### 5. **Real Files for GitHub**
   - Modular `index.html` shell
   - Design system in `css/styles.css`
   - Per-feature JS modules in `js/`
   - Updated `README.md` with actual screenshots + demo flow
   - GitHub Actions CI workflow
   - License, contributing, CHANGELOG

## Build Status

See `STATUS.md` for the live build status and what was delivered.
