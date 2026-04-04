# Niyantrit Hackathon Execution Plan

Status date: 2026-04-04
Goal: Win demo day with a stable, high-impact, end-to-end story.

## Demo Theme
AI-powered civic monitoring for public works with role-based actionability.

## Scope Freeze
1. Must-have flow (locked):
- Role login for Citizen, Contractor, Official.
- Complaint submission (text and voice where available).
- AI enhancement and categorization.
- Structured contractor milestone update persistence.
- Official resolution flow.
- Risk score visibility at project/dashboard level.

2. Wow feature (chosen):
- Geospatial risk map with project-level drill-down and complaint context.
- Keep this as the single headline differentiator.

3. Defer for after hackathon:
- Full blockchain production workflow.
- Complex deepfake pipeline.
- Mobile app and broad multilingual rollout.

## 36-Hour Plan
1. Hours 0-6: Stability lock
- Keep backend and frontend start commands fixed.
- Run smoke test after any major change.
- Remove all non-demo blockers.

2. Hours 6-18: Wow polish
- Improve map clarity, legends, and status overlays.
- Ensure high-risk projects are visually obvious.
- Add project drill-down CTA from map markers.

3. Hours 18-28: Judge-focused UX
- Empty states, loading states, and error fallback messaging.
- Fast paths for role switching during demo.
- Ensure data seeding gives visually strong dashboards.

4. Hours 28-36: Final rehearsal and packaging
- Rehearse the 4-minute script twice.
- Record 60-second backup video walkthrough.
- Freeze code except bug fixes.

## 4-Minute Demo Script
1. Problem (30s)
- Public project complaints are slow, unstructured, and hard to prioritize.

2. Citizen submission (45s)
- Submit complaint quickly (text or voice), show AI formatting.

3. Contractor update (45s)
- Submit milestone update with structured fields and costs.

4. Official action (45s)
- Review queue, inspect details, resolve issue.

5. Risk + map intelligence (60s)
- Show risk distribution on map and project impact.

6. Close (15s)
- End with measurable outcomes: faster routing, clearer accountability, stronger visibility.

## Demo Safety Nets
1. If OpenAI fails:
- Display fallback text and continue with manual category.

2. If speech fails:
- Switch to text complaint path immediately.

3. If one server restarts:
- Run quick health checks and resume at next script step.

## Runbook Commands
1. Backend
- C:/Users/ADMIN/AppData/Local/Programs/Python/Python313/python.exe -m uvicorn main:app --reload

2. Frontend
- npm run dev

3. Smoke test
- .\hackathon_smoke_test.ps1

4. Preflight
- .\hackathon_preflight.ps1 -RunSmokeTest

## Success Criteria Before Submission
1. Startup is reliable on first attempt.
2. End-to-end smoke test passes.
3. Map wow feature is visually clear in < 10 seconds.
4. 4-minute script runs without dead time.
5. Backup video recorded.
