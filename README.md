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
3. Generate client and migrate DB:
   - `Push-Location backend; npx prisma generate; npx prisma migrate dev --name init; Pop-Location`
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
