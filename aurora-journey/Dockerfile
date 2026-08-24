FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system shipflow && adduser --system --ingroup shipflow shipflow
COPY --from=deps --chown=shipflow:shipflow /app/.next/standalone ./
COPY --from=deps --chown=shipflow:shipflow /app/.next/static ./.next/static
USER shipflow
EXPOSE 3000
CMD ["node", "server.js"]
