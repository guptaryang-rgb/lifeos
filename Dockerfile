# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Stage 2: Build Next.js
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./
COPY --from=builder /app/index.html ./
COPY --from=builder /app/css ./css
COPY --from=builder /app/js ./js
COPY --from=builder /app/icons ./icons
COPY --from=builder /app/manifest.json ./
COPY --from=builder /app/service-worker.js ./
COPY --from=builder /app/src/lib ./src/lib

EXPOSE 3000 4000

# Start both servers
CMD ["sh", "-c", "npx next start -p 4000 & node server.js"]
