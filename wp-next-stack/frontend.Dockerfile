# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS build
ARG FRONTEND_REPO_URL
ARG FRONTEND_REPO_REF=main
ARG NEXT_PUBLIC_WP_URL
ARG WP_API_BASE

WORKDIR /app
RUN apk add --no-cache git
RUN if [ -z "$FRONTEND_REPO_URL" ]; then echo "FRONTEND_REPO_URL is required" >&2; exit 1; fi
RUN git clone --depth 1 --branch "$FRONTEND_REPO_REF" "$FRONTEND_REPO_URL" .

ENV NEXT_PUBLIC_WP_URL=$NEXT_PUBLIC_WP_URL
ENV WP_API_BASE=$WP_API_BASE

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","start"]
