# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CheckCle is an open-source, real-time full-stack monitoring platform for uptime monitoring, server infrastructure insights, and operational management. The project uses a monorepo structure with a React/TypeScript frontend and Go backend services.

## Development Commands

### Frontend (application/)
```bash
cd application
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:8990)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Backend (server/)
```bash
# PocketBase (database/auth)
cd server
./pocketbase serve --http=0.0.0.0:8090 --dir pb_data

# Service Operation (Go monitoring service)
cd server/service-operation
go run main.go       # Runs on port 8091
```

### Docker
```bash
# Development
docker-compose -f docker/docker-compose-dev.yml up

# Production
docker-compose up    # Uses operacle/checkcle:latest
```

## Architecture

```
├── application/              # React frontend (Vite + TypeScript)
│   └── src/
│       ├── pages/           # Route pages (Dashboard, Login, Settings, etc.)
│       ├── components/      # UI components (shadcn/ui based)
│       ├── services/        # API service modules (PocketBase SDK)
│       ├── contexts/        # React contexts (Theme, Language, Sidebar)
│       ├── hooks/           # Custom React hooks
│       ├── translations/    # i18n (EN, KM, JA, ZH-CN, DE)
│       └── lib/             # Utilities and PocketBase client
├── server/
│   ├── pocketbase           # PocketBase binary (SQLite database + REST API)
│   ├── pb_migrations/       # Database schema (pb_schema.json)
│   └── service-operation/   # Go microservice for monitoring
│       ├── handlers/        # HTTP handlers (/operation, /health)
│       ├── operations/      # Network ops (ping, dns, tcp, http, ssl)
│       ├── monitoring/      # Core monitoring orchestration
│       ├── uptime-monitoring/    # Service uptime checks
│       ├── server-monitoring/    # Server metrics collection
│       ├── ssl-monitoring/       # SSL certificate monitoring
│       ├── notification/         # Alert dispatch (email, telegram, discord, slack)
│       └── data-retention/       # Cleanup scheduler
└── docker/                  # Docker configurations
```

## Key Technical Details

- **Frontend path alias**: `@/*` resolves to `./src/`
- **Ports**: Frontend dev (8990), PocketBase (8090), Service Operation (8091)
- **Authentication**: Dual auth system using PocketBase `users` and `_superusers` collections
- **Database**: SQLite-based PocketBase with schema in `server/pb_migrations/pb_schema.json`
- **UI Components**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **State Management**: React Query for server state, React Context for app state
- **Real-time**: PocketBase subscriptions for live updates

## Git Workflow

- Main development branch: `develop`
- PRs should target: `develop`
