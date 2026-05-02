# Rwanda Pay — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Premium fintech mobile app (Expo/React Native) with a Node.js/Express backend and PostgreSQL database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken) + bcryptjs, stored in expo-secure-store
- **Validation**: Zod, drizzle-zod
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo Router v6, React Native, Reanimated

## Artifacts

| Artifact | Dir | Port | Path |
|---|---|---|---|
| API Server | `artifacts/api-server` | 8080 | `/api` |
| Rwanda Pay (Expo) | `artifacts/rwanda-pay` | 20371 | `/` |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

Tables: `users`, `wallets`, `cards`, `transactions`

- **users** — email, password_hash, name, phone, initials
- **wallets** — one per user, balance in RWF (integer)
- **cards** — last4, cardType, holderName, cardName, color, isDefault
- **transactions** — type (topup/send/receive/payment), amount, description, category, cardId, recipientId

## API Endpoints

All protected routes require `Authorization: Bearer <jwt>` header.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Email+password signup, creates wallet + 3 seed cards |
| POST | `/api/auth/login` | — | Returns JWT + user + wallet balance |
| GET | `/api/auth/me` | ✓ | Get current user + wallet balance |
| PUT | `/api/auth/profile` | ✓ | Update name/phone |
| POST | `/api/auth/logout` | ✓ | Invalidate session |
| GET | `/api/cards` | ✓ | List user cards |
| POST | `/api/cards` | ✓ | Add card |
| DELETE | `/api/cards/:id` | ✓ | Remove card |
| PUT | `/api/cards/:id/default` | ✓ | Set default card |
| GET | `/api/wallet` | ✓ | Get wallet balance |
| POST | `/api/wallet/topup` | ✓ | Top up wallet from card |
| POST | `/api/wallet/transfer` | ✓ | Send money to another user by email |
| POST | `/api/wallet/pay` | ✓ | NFC tap-to-pay simulation |
| GET | `/api/transactions` | ✓ | List transactions (limit/offset/type filters) |
| GET | `/api/transactions/analytics` | ✓ | Spending breakdown by category + monthly |

## Mobile App Features

- Animated green splash screen (3s, then auto-navigates)
- Email/password Sign In / Sign Up (primary)
- Google + Apple sign-in stubs (coming soon — needs OAuth credentials)
- Demo account (auto-creates on first tap)
- JWT stored in expo-secure-store, persisted across launches
- Home: wallet balance (from backend), card carousel, quick actions
- Quick actions: Pay (NFC), Send, Receive, **Top Up**
- Top-Up modal: pick card + amount → calls `/api/wallet/topup`
- Pay tab: NFC payment simulation with Face ID
- Analytics, full transaction history
- Settings: profile edit, sign out, Face ID toggle, balance hide

## Environment Variables

- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)
- `DATABASE_URL`, `PGHOST`, etc. — auto-set by Replit PostgreSQL
- `EXPO_PUBLIC_DOMAIN` — Replit dev domain (set in workflow, used for API calls from mobile)

## Future: Real Google/Apple OAuth

1. Get Google OAuth Client ID (free — Google Cloud Console)
2. Apple Developer account ($99/yr) for Sign In with Apple
3. Replace mock `signInWithGoogle/signInWithApple` in `context/AuthContext.tsx`
4. Add `/api/auth/google` and `/api/auth/apple` backend routes to verify tokens
