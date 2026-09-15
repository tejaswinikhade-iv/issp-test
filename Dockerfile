FROM node:current-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package*.json .npmrc* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:current-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache aws-cli curl supervisor tzdata jq yq
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/config.yml ./config.yml

COPY supervisord.conf /etc/supervisord.conf
COPY issp-ctl /usr/local/bin/issp-ctl
RUN chmod +x /usr/local/bin/issp-ctl
RUN ln -sf /usr/share/zoneinfo/$(yq ".timezone" /app/config.yml) /etc/localtime

EXPOSE 3000
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
