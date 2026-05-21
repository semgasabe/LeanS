FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates wget

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY src ./src
COPY prisma ./prisma
COPY openapi.yaml ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
# Dokku / DeployRocks: declare web listener port (with app.json healthcheck port 3000)
LABEL com.dokku.app-ports.web=3000

ENTRYPOINT ["sh", "./entrypoint.sh"]
