# Machine handoff — Super Reader Championship

Use this doc when cloning and spinning up the project on a new machine. Commit and push this file before you leave the old machine so it travels with the repo.

## Snapshot

| | |
|---|---|
| **Product** | Super Reader Championship — multi-tenant reading-competition PWA for friend groups / book clubs |
| **Repo** | https://github.com/kschmidt1210/ReadingChampions |
| **Live** | https://reading-champions.vercel.app |
| **Stack** | Next.js 16, React 19, TypeScript, Supabase, Tailwind 4 / shadcn, Serwist (PWA) |

Deeper product context:

- [docs/superpowers/specs/2026-03-11-super-reader-championship-design.md](docs/superpowers/specs/2026-03-11-super-reader-championship-design.md)
- [docs/personas.md](docs/personas.md)
- [docs/ui-ux-design.md](docs/ui-ux-design.md)
- [docs/mobile-design.md](docs/mobile-design.md)

Cursor rules under [`.cursor/rules/`](.cursor/rules/) mirror the personas / UI / mobile docs.

---

## Before you leave this machine

Do this first — cloning alone will not bring everything over.

### 1. Push unpushed git work

Branch `feature/super-reader-championship` may be ahead of `origin` (e.g. competitive positioning doc). Push it:

```bash
git push -u origin feature/super-reader-championship
```

Also commit and push this `HANDOFF.md` (and anything else you want on the new machine) from the branch where you want it available — typically `main` or the feature branch.

### 2. Local-only files that are not on GitHub

These are untracked / worktree-only unless you copy or commit them:

| Path | What it is |
|------|------------|
| `.worktrees/implement/docs/plans/2026-07-09-fix-plan.md` | Bug-fix / security / UX plan |
| `.superpowers/brainstorm/` | HTML mockups from design brainstorming |

If you still need them, copy the files elsewhere or commit them to a branch and push.

### 3. Secrets will not travel with git

`.env*` is gitignored. Recreate `.env.local` on the new machine from Vercel or Supabase (see [Environment variables](#environment-variables)). Never commit secrets.

---

## On the new machine

### Prerequisites

- **Node.js 20+** (recommended; no `engines` field in `package.json`, but `@types/node` is `^20`)
- **npm** (repo uses npm; [`.npmrc`](.npmrc) sets `legacy-peer-deps=true`)
- **GitHub auth** — HTTPS (credential helper / `gh auth login`) or SSH key with access to the repo

### Clone and install

HTTPS:

```bash
git clone https://github.com/kschmidt1210/ReadingChampions.git
cd ReadingChampions
npm install
```

SSH:

```bash
git clone git@github.com:kschmidt1210/ReadingChampions.git
cd ReadingChampions
npm install
```

To continue feature work:

```bash
git fetch origin
git checkout feature/super-reader-championship
```

### Environment variables

Create `.env.local` in the repo root:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser / server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin and other RLS-bypass server paths |

**Where to get values:**

1. **Supabase** → Project Settings → API (URL, anon key, service role key), or
2. **Vercel** → Project → Settings → Environment Variables (production already has these for the live deploy)

Optional for one-off scripts only: `SUPABASE_URL` (falls back to `NEXT_PUBLIC_SUPABASE_URL`).

### Database

- Migrations: [`supabase/migrations/`](supabase/migrations/) (`001`–`010`). Do not edit existing migrations; add `011+` for schema changes.
- Seed: [`supabase/seed.sql`](supabase/seed.sql)
- Day-to-day setup is **remote Supabase + Vercel**. There is no checked-in `supabase/config.toml` for local Supabase CLI.

### Run and verify

```bash
npm run dev          # http://localhost:3000
npx jest
npm run lint
npx tsc --noEmit
npm run build
```

Manual smoke checklist:

1. Log in
2. Leaderboard loads
3. Log a book (live score feedback)
4. My Books
5. Community feed
6. Admin settings (if your account is an org admin)

---

## Deploy and ops

- Production deploys from **`main`** via Vercel (`vercel[bot]`). Live site: https://reading-champions.vercel.app
- One-off maintenance scripts in [`scripts/`](scripts/) need the service role key and some hardcode org/season IDs — **do not run casually against production**.

### Branches

| Branch | Notes |
|--------|--------|
| `main` | Default; production |
| `feature/super-reader-championship` | Active feature branch — push before switching machines |

---

## Quick reference

| Task | Command / link |
|------|----------------|
| Clone | `git clone https://github.com/kschmidt1210/ReadingChampions.git` |
| Install | `npm install` |
| Dev server | `npm run dev` |
| Tests | `npx jest` |
| Lint / types | `npm run lint` / `npx tsc --noEmit` |
| GitHub | https://github.com/kschmidt1210/ReadingChampions |
| Production | https://reading-champions.vercel.app |
