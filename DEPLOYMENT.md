# Deployment Guide

## Architecture
- Frontend: Vite React app deployed as static site (Vercel/Netlify)
- Backend: FastAPI app deployed as web service (Render/Railway/Fly)
- Database: PostgreSQL (recommended for production)

## 1. Backend Deployment

### Required environment variables
- `SECRET_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY` (if AI features are enabled)
- `FIREBASE_CREDENTIALS_PATH`
- `FIREBASE_PROJECT_ID`
- `CORS_ORIGINS` (comma-separated frontend origins)
- `PORT` (provided by platform; defaults to 8000)

### Start command
Use the included `Procfile`:

```bash
web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Notes
- Ensure `DATABASE_URL` points to a managed PostgreSQL instance.
- Store Firebase service account JSON securely and set `FIREBASE_CREDENTIALS_PATH` to that file location.

## 2. Frontend Deployment

### Required environment variables
- `VITE_API_BASE`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- Optional: `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`

### Build command
```bash
npm ci
npm run build
```

### Vercel SPA routing
`niyantrit-frontend/vercel.json` already includes rewrite to `index.html`.

## 3. CORS Setup
Set backend `CORS_ORIGINS` to include deployed frontend domains, for example:

```env
CORS_ORIGINS=https://your-app.vercel.app,https://www.your-domain.com
```

## 4. Pre-deploy Checklist
- `.env` files are not committed.
- Service account JSON is not committed.
- Backend health endpoint responds: `/health`
- Frontend points to correct backend URL (`VITE_API_BASE`).
- Google provider is enabled in Firebase Authentication.

## 5. Smoke Test
1. Open frontend URL.
2. Login with email and password.
3. Login with Google.
4. Verify projects load and issues page map renders.
5. Hit backend `/health` endpoint.
