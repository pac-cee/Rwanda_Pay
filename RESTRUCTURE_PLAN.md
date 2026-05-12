# Rwanda Pay - Clean Structure Plan

## Current Issues:
1. Duplicate backend/ folders (root and inside frontend/)
2. Duplicate docs/ folders
3. Duplicate database/ folders
4. Mobile app scattered in multiple places (artifacts/rwanda-pay AND frontend/rwanda-pay)
5. Node.js API server mixed with mobile app

## Target Structure:

Rwanda-Pay/
├── backend/                    ← Go backend (KEEP)
│   ├── cmd/
│   ├── internal/
│   ├── pkg/
│   ├── tests/
│   ├── Dockerfile
│   └── go.mod
│
├── frontend/                   ← React Native mobile app ONLY
│   ├── app/                    ← Expo Router screens
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   ├── assets/
│   ├── .env
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       ← All documentation
│   ├── 00-final-project-documentation.md
│   ├── 01-requirements.md
│   ├── 02-srs.md
│   ├── 03-uml-diagrams.md
│   ├── 04-system-design.md
│   ├── 05-prototype-patterns.md
│   ├── 06-docker.md
│   ├── 07-testing.md
│   ├── 08-test-results.md
│   ├── 09-architecture-diagrams.md
│   └── 10-deployment-packaging.md
│
├── database/                   ← Database initialization
│   ├── init.sql
│   └── pgadmin-servers.json
│
├── docker-compose.yml          ← Docker orchestration
├── .gitignore
└── README.md

## What to DELETE:
- frontend/backend/             ← Duplicate Go backend
- frontend/docs/                ← Duplicate docs
- frontend/database/            ← Duplicate database
- frontend/artifacts/api-server/ ← Node.js API (replaced by Go)
- frontend/artifacts/mockup-sandbox/ ← Not needed
- frontend/lib/                 ← Monorepo stuff (not needed)
- frontend/scripts/             ← Not needed
- frontend/rwanda-pay/          ← Duplicate mobile app

## What to MOVE:
- frontend/artifacts/rwanda-pay/* → frontend/
  (Move all mobile app files to frontend root)

## What to KEEP:
- backend/ (root level - Go)
- docs/ (root level)
- database/ (root level)
- docker-compose.yml (root level)
