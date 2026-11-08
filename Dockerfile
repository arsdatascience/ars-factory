# -------------------------------------------------------------
# Stage 1: Build & Dependencies
# -------------------------------------------------------------
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code
COPY src ./src

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Prune devDependencies to keep only production packages
RUN npm prune --omit=dev

# -------------------------------------------------------------
# Stage 2: Production Runtime
# -------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4001 \
    HOST=0.0.0.0

# Install curl for Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy production node_modules and compiled code
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 4001

# Healthcheck configuration (read by Coolify and Docker daemon)
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4001/health || exit 1

CMD ["sh", "-c", "if [ \"$FACTORY_RUN_MIGRATIONS\" = true ]; then npm run migrate || exit $?; fi; exec node dist/index.js"]

