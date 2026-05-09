# Rwanda Pay — Documentation Index

This folder contains the complete academic documentation for the Rwanda Pay project, structured according to the four phases required by the course **Best Programming Practices and Design Patterns**.

---

## Phase Structure

| Phase | Document | Contents |
|---|---|---|
| **Phase 1** | [01-requirements.md](./01-requirements.md) | Case study, problem analysis, functional diagram, OO analysis, functional/non-functional requirements |
| **Phase 1** | [02-srs.md](./02-srs.md) | Full Software Requirements Specification |
| **Phase 1** | [03-uml-diagrams.md](./03-uml-diagrams.md) | Use Case, Class, Activity (NFC + Registration), Sequence (NFC + Transfer), Component diagrams |
| **Phase 1** | [04-system-design.md](./04-system-design.md) | Architecture, ERD, data flow, deployment |
| **Phase 2** | [05-prototype-patterns.md](./05-prototype-patterns.md) | Prototype description, design patterns (Repository, Context, Middleware, Strategy, Factory, Template Method), coding standards |
| **Phase 3** | [06-docker.md](./06-docker.md) | Docker multi-stage build, docker-compose, environment variables, Git VCS |
| **Phase 4** | [07-testing.md](./07-testing.md) | Full software test plan — 62 unit tests all passing, integration tests, E2E scenarios, security checklist |

---

## Quick Summary

**Topic:** Rwanda Pay — Digital Wallet & Tap-to-Pay Mobile Application

**Case Study:** The Rwandan digital payments gap — Apple Pay and Google Pay do not operate in Rwanda, leaving millions of smartphone users without a native tap-to-pay solution.

**Solution:** A full-stack mobile fintech application with:
- React Native / Expo mobile app (iOS + Android)
- Go 1.22 / Fiber v2 REST API
- PostgreSQL 16 database (pgx/v5 driver)
- JWT authentication, biometric payment authorization
- AES-256-GCM card number encryption
- Atomic wallet transactions with SELECT FOR UPDATE row-level locking
- Digital wallet, card management, NFC-simulated payments, analytics

---

## Running the Project

### With Docker (recommended)
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Start everything
docker-compose up --build

# Test the API
curl http://localhost:8080/healthz
```

### Without Docker (development)
```bash
# Start PostgreSQL and run database/init.sql

# Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env

# Run backend
cd backend && go run ./cmd/server

# Run mobile app
cd rwanda-pay && npx expo start
```

### Run Tests
```bash
cd backend && go test ./tests/unit/... -v
```
