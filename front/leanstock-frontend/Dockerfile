FROM node:20-alpine AS build

WORKDIR /app

# DeployRocks: frontend and API are different domains.
# Use API domain in the built bundle; CORS must allow the frontend origin.
# DeployRocks: set in dashboard build-arg or use defaults below
ARG VITE_API_URL=https://semgasabe-leans-api.kazi.rocks/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
