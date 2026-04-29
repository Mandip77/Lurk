FROM node:20-alpine AS base

# WeasyPrint system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-weasyprint \
    pango \
    harfbuzz \
    cairo \
    libffi \
    musl-dev \
    gcc

# Python deps
COPY requirements.txt .
RUN pip3 install --break-system-packages -r requirements.txt

# Node deps
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
COPY requirements.txt .
RUN pip3 install --break-system-packages -r requirements.txt

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
