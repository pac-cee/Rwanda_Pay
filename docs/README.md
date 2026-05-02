# Rwanda Pay — Documentation Index

This folder contains the full software documentation for the Rwanda Pay fintech mobile application.

---

## Documents

| # | Document | Description |
|---|---|---|
| 01 | [Requirements (SRD)](./01-requirements.md) | Functional & non-functional requirements, constraints, assumptions |
| 02 | [Software Requirements Specification (SRS)](./02-srs.md) | Detailed system features, API interface, DB schema, validation rules, error handling |
| 03 | [UML Diagrams](./03-uml-diagrams.md) | Use case, class, and sequence diagrams (Mermaid) |
| 04 | [System Design](./04-system-design.md) | Architecture, monorepo structure, navigation, data flow, ERD, deployment (Mermaid) |
| 05 | [Testing Strategy & Test Plan](./05-testing.md) | Unit, integration, component, E2E, and security tests |

---

## Quick System Summary

```
Rwanda Pay
├── Mobile App       Expo / React Native (iOS + Android)
├── API Server       Node.js 24 / Express 5  →  port 8080
├── Database         PostgreSQL + Drizzle ORM
└── Shared Libs      pnpm workspace (db schema, Zod, API client)
```

### Core Features
- JWT authentication (register / login / demo account)
- Digital wallet in RWF with top-up, transfer, and NFC tap-to-pay
- Multi-card management (Visa / Mastercard / Amex / MTN MoMo)
- Transaction history with date grouping and type filtering
- Spending analytics (weekly / monthly, by category)
- Biometric (Face ID / fingerprint) payment authorization
- Balance hide/show toggle persisted across sessions
