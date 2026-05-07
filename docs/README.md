# Rwanda Pay — Documentation Index

This folder contains the complete academic documentation for the Rwanda Pay project, structured according to the four phases required by the course **Best Programming Practices and Design Patterns**.

---

## Phase Structure

| Phase | Document | Contents |
|---|---|---|
| **Phase 1** | [01-requirements.md](./01-requirements.md) | Case study, problem analysis, functional diagram, OO analysis |
| **Phase 1** | [02-srs.md](./02-srs.md) | Full Software Requirements Specification |
| **Phase 1** | [03-uml-diagrams.md](./03-uml-diagrams.md) | Use Case, Class, Activity, Sequence, Component diagrams |
| **Phase 1** | [04-system-design.md](./04-system-design.md) | Architecture, ERD, data flow, deployment |
| **Phase 2** | [05-prototype-patterns.md](./05-prototype-patterns.md) | Prototype description, design patterns, coding standards |
| **Phase 3** | [06-docker.md](./06-docker.md) | Docker process, Dockerfiles, docker-compose, Git VCS |
| **Phase 4** | [07-testing.md](./07-testing.md) | Full software test plan |

---

## Quick Summary

**Topic:** Rwanda Pay — Digital Wallet & Tap-to-Pay Mobile Application

**Case Study:** The Rwandan digital payments gap — Apple Pay and Google Pay do not operate in Rwanda, leaving millions of smartphone users without a native tap-to-pay solution.

**Solution:** A full-stack mobile fintech application with:
- React Native / Expo mobile app (iOS + Android)
- Node.js / Express 5 REST API
- SQLite database (dev) / PostgreSQL (prod) via Drizzle ORM
- JWT authentication, biometric payment authorization
- Digital wallet, card management, NFC-simulated payments, analytics
