FROM node:20-slim AS builder

WORKDIR /app

# Установить OpenSSL и зависимости
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:20-slim

WORKDIR /app

# Установить OpenSSL и CA证书
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY src ./src
COPY prisma ./prisma
COPY openapi.yaml ./

EXPOSE 3000

# Добавить переменные окружения
ENV NODE_ENV=production
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@prisma/client/runtime/libquery_engine-debian-openssl-3.0.x.so.node

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]