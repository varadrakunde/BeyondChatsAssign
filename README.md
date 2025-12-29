# BeyondChats Assignment Scaffold

This repository sets up a clean, minimal full‑stack structure you can extend to meet the assignment.

## Phases
1. Scope & Criteria
2. Architecture & Specs
3. Scaffold Repo Structure
4. Backend API
5. Frontend UI
6. Integration
7. Testing & CI
8. Deployment
9. Documentation
10. Git Workflow

## Structure
- backend/ — Node/Express server with health endpoint + CRUD
- docs/ — Add specs, ERD, and decisions

Note: `frontend/` was removed to focus Phase 1 on backend scraping + APIs.

## Quick Start (Backend)
1. Copy `.env.example` to `.env`; ensure `DATABASE_URL="file:./dev.db"`
2. Install deps (PowerShell):
   - `Push-Location backend; npm install; Pop-Location`
3. Generate client and sync schema (MongoDB):
   - `Push-Location backend; npx prisma generate; npx prisma db push; Pop-Location`
4. Scrape the 5 oldest blog articles (Phase 1):
   - `Push-Location backend; npm run scrape; Pop-Location`
5. Run dev server:
   - `Push-Location backend; npm run dev; Pop-Location`
6. Health: open http://localhost:3000/health

## APIs (CRUD Articles)
- **List:** GET `/api/articles?q=ai&page=1&pageSize=10`
- **Get:** GET `/api/articles/:id`
- **Create:** POST `/api/articles` — body: `{ title, slug, url, author?, summary?, content?, publishedAt? }`
- **Update:** PUT `/api/articles/:id` — same fields as create
- **Delete:** DELETE `/api/articles/:id`

Example (PowerShell using curl):

```
curl http://localhost:3000/api/articles
curl http://localhost:3000/api/articles/1
```

## Git Workflow
- Initialize: `git init && git branch -M main`
- First commit: `git add . && git commit -m "chore: scaffold"`
- Add remote: `git remote add origin https://github.com/<you>/<repo>.git`
- Push: `git push -u origin main`
- Feature branch: `git checkout -b feature/<name>` then PR to `main`

## Notes
- Keep README updated with any new endpoints, pages, and setup steps.
- Add CI and tests as you implement features.

## Deployment (Render + Mongo Atlas)
- **Create MongoDB Atlas cluster:** Get a connection string and add a database name, e.g., `/beyondchats`.
- **Set env vars on Render:** `DATABASE_URL`=`mongodb+srv://.../beyondchats` and `NODE_VERSION=20`.
- **Add render.yaml:** Present at repo root to define the web service and a cron job for the scraper.
- **Build/Start:** Render runs `npm ci && npx prisma generate` and starts with `node src/server.js`.
- **Sync schema (prod):** Use `prisma db push` during build or manually via shell.
- **Scraper:** The cron job runs `npm run scrape` daily to refresh articles.

Manual deploy steps:
1. Push repo to GitHub (already done).
2. On Render, "New +" → "Blueprint" → select your repo.
3. Set `DATABASE_URL` and `NODE_VERSION` env vars in the service.
4. Deploy; visit the service URL → `/health` and test APIs.

## Phase 2 Script
- Configure env in `backend/.env`:
   - `API_BASE_URL` (default `http://localhost:3000`)
   - `OPENAI_API_KEY` (optional; if absent, the script performs a naive merge)
   - `OPENAI_MODEL` (default `gpt-4o-mini`)
   - `PHASE2_LIMIT` number of articles to process (default 1)
- Run locally:

```
Push-Location backend
npm run dev   # in one terminal (API server)
Pop-Location

Push-Location backend
npm run phase2
Pop-Location
```

What it does:
- Fetches articles from the CRUD API.
- Searches Google for each title, picks top 2 external blog/article links.
- Scrapes those pages and extracts clean text.
- Calls an LLM (if API key provided) to rewrite and format the article inspired by references.
- Publishes a new article via `POST /api/articles` with references appended.

Notes:
- Google HTML may change; if search fails, add a SERP API (e.g., SerpAPI or Google CSE) and wire it into `src/phase2.js`.
 - To use SerpAPI: set `SERPAPI_KEY` in `.env`.
 - To use Google CSE: set `GOOGLE_CSE_KEY` and `GOOGLE_CSE_CX` in `.env`.

## API Spec
- See [docs/openapi.yaml](docs/openapi.yaml) (OpenAPI 3). Use Swagger Editor to view.
