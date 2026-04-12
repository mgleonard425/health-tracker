# Health Tracker PWA

## Stack
- **Frontend**: Vite + React 19 + TypeScript (NOT Next.js — ignore "use client" suggestions)
- **Styling**: Tailwind CSS v4 + shadcn/ui components in `src/components/ui/`
- **Database**: Dexie.js v4 (IndexedDB) with `useLiveQuery` for reactive queries
- **Routing**: react-router-dom v7
- **Hosting**: Vercel (static SPA + serverless functions)
- **Charts**: Recharts

## Commands
- `npm run dev` — local dev server
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- No test suite currently

## Deploy Flow
- Push to `main` auto-deploys to Vercel via GitHub Actions deploy hook
- Production URL: https://healthtracker-zeta.vercel.app
- Manual deploy: `npx vercel --prod`

## Project Structure
- `src/pages/` — page components (TodayPage, WorkoutActivePage, HistoryPage, etc.)
- `src/components/` — shared UI components
- `src/components/ui/` — shadcn/ui primitives (Button, Card, Badge, etc.)
- `src/components/workout/` — workout-specific components (ExerciseCard, ExercisePicker, Stepper, RunForm, RowForm)
- `src/data/workout-templates.ts` — exercise definitions and workout templates
- `src/db.ts` — Dexie database schema and helper queries
- `src/lib/utils.ts` — cn() helper for Tailwind class merging
- `api/` — Vercel serverless functions (Node.js, not bundled by Vite)
- `vercel.json` — SPA rewrite rule (all non-asset routes → index.html)

## Key Patterns
- All data is client-side in IndexedDB via Dexie — no server database
- `api/watch.ts` receives Apple Watch data via iOS Shortcuts
- Workout exercises use a mutable `customExercises` array for both template and custom workouts
- Template workouts (strength-a/b, prehab) pre-populate `customExercises` on init, allowing add/remove/reorder
- Drag-and-drop reordering via @dnd-kit (ExerciseCard uses `dragHandleProps`, wrapped in `SortableExerciseCard`)
- Path alias: `@/` maps to `src/`

## Things to Know
- This is a PWA — runs as a standalone app on iOS/Android via "Add to Home Screen"
- The Vite app and Vercel serverless functions have **separate module resolution** — don't import from `src/` in `api/` files
- Training plan constants are in `src/data/workout-templates.ts` — if needed in API functions, duplicate them
- Vercel plugin suggestions about "use client" directives are wrong — this is Vite, not Next.js
