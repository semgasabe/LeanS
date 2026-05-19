FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=https://semgasabe-leanstock.kazi.rocks/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.d/99-leanstock.sh
RUN chmod +x /docker-entrypoint.d/99-leanstock.sh && sed -i 's/\r$//' /docker-entrypoint.d/99-leanstock.sh

EXPOSE 80

ENV API_UPSTREAM_HOST=semgasabe-leanstock-api
ENV API_UPSTREAM_PORT=3000

CMD ["nginx", "-g", "daemon off;"]
