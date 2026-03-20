# comparesome

CompaResome is a monorepo app for personal comparison and ranking with shared participants.

## Stack

- **Frontend**: React + Vite + PNPM + Vitest
- **Backend**: Go + PostgreSQL + JWT Bearer Auth
- **Infra**: Docker Compose, Nginx frontend image
- **CI/CD**: GitHub Actions with separate frontend/backend path filters + deploy workflow

## Features implemented

- Login-only auth model (no open registration)
- Seeded admin account on first startup: `admin / admin`
- First login forces admin password change
- Role-based authorization (admin + common user)
- Admin panel:
  - create users
  - toggle feature flags
  - update global setting: max variants per user per comparison (default 10)
- Comparison flow:
  - create comparison entities
  - select up to 5 total participants per comparison
  - each participant adds variants
  - each participant adds personal pros/cons/rank (1..10) for each variant
- Dashboard:
  - latest comparisons
  - top 2 variants by summary rank for each latest comparison
  - top rated variants across accessible comparisons

## Repository layout

- `frontend/*` React app
- `backend/*` Go API server
- `docker/postgres/init/01-create-db.sql` database creation init script (`comparesome`)
- `.github/workflows/*` CI/CD workflows

## Run with Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5443`
- Backend API: `http://localhost:8080`
- Postgres: `localhost:5432` (db: `comparesome`)

## Local development

### Frontend

```bash
pnpm install
pnpm --filter frontend dev
```

### Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

Required backend env variables:

- `DATABASE_DSN` (example: `postgresql://postgres:postgres@localhost:5432/comparesome?sslmode=disable`)
- `JWT_SECRET` (any secure secret)
- `CORS_ALLOWED_ORIGINS` (comma-separated list, default includes localhost + `http://158.160.231.213` + `каргины.рф`)
- optional `PORT` (default `8080`)

## API overview

- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET /api/me`
- `GET /api/dashboard`
- `GET/POST /api/comparisons`
- `GET /api/comparisons/{id}`
- `POST /api/comparisons/{id}/variants`
- `PUT /api/variants/{id}/rating`
- Admin:
  - `GET/POST /api/admin/users`
  - `GET/PUT /api/admin/feature-flags`
  - `GET/PUT /api/admin/settings`

## GitHub Actions

- `ci-frontend.yml`: runs only when `frontend/*` (or workspace frontend config files) changes
- `ci-backend.yml`: runs only when `backend/*` changes
- `deploy.yml`: deploys to host over SSH

### Required deploy secrets

Add these repository secrets:

- `DEPLOY_HOST` - server IP or DNS
- `DEPLOY_USER` - SSH user
- `DEPLOY_SSH_PRIVATE_KEY` - private key content
- `DEPLOY_TARGET_PATH` - remote directory to sync repository
- `DEPLOY_PORT` - optional SSH port (defaults to 22)

## Development process

- Trunk-based workflow supported by CI path filters.
- Feature flags are runtime-controlled by admin.
