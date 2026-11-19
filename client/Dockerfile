FROM node:20-alpine AS build
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
ARG VITE_API_URL=
ARG VITE_CSRF_COOKIE_NAME=teamhub.csrf
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CSRF_COOKIE_NAME=$VITE_CSRF_COOKIE_NAME
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
