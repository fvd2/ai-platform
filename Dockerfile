# Stage 1: Build Angular frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm ng build

# Stage 2: Build Fastify API
FROM node:22-alpine AS api-build
WORKDIR /app/api
RUN corepack enable pnpm
COPY api/package.json api/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY api/ .
RUN pnpm build

# Stage 3: Runtime
FROM node:22-alpine
WORKDIR /app
RUN corepack enable pnpm

# Copy built API
COPY --from=api-build /app/api/dist ./dist
COPY --from=api-build /app/api/package.json ./
COPY --from=api-build /app/api/node_modules ./node_modules
COPY api/src/db/schema.sql ./dist/db/schema.sql

# Copy built Angular app
COPY --from=frontend-build /app/dist/ai-platform/browser ./public

ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
