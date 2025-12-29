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
- backend/ — Node/Express server with health endpoint
- frontend/ — Minimal HTML that calls the backend
- docs/ — Add specs, ERD, and decisions

## Quick Start (Backend)
1. Copy `.env.example` to `.env`; optionally change `PORT`
2. Install deps:
   - Windows PowerShell: `Push-Location backend; npm install; Pop-Location`
3. Run dev server:
   - `Push-Location backend; npm run dev; Pop-Location`
4. Open http://localhost:3000/health

## Git Workflow
- Initialize: `git init && git branch -M main`
- First commit: `git add . && git commit -m "chore: scaffold"`
- Add remote: `git remote add origin https://github.com/<you>/<repo>.git`
- Push: `git push -u origin main`
- Feature branch: `git checkout -b feature/<name>` then PR to `main`

## Notes
- Keep README updated with any new endpoints, pages, and setup steps.
- Add CI and tests as you implement features.
