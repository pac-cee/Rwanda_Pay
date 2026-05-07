# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace config files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY .npmrc ./

# Copy shared libraries
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod

# Copy api-server source
COPY artifacts/api-server ./artifacts/api-server

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the api-server
RUN pnpm --filter @workspace/api-server run build

# Stage 2: Production image
FROM node:24-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY .npmrc ./

COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder stage
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

WORKDIR /app/artifacts/api-server

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
