# Stage 1: Install production dependencies
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Run the application without npm
FROM gcr.io/distroless/nodejs24-debian13:nonroot

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=nonroot:nonroot /app/node_modules ./node_modules

COPY --chown=nonroot:nonroot app.js server.js metrics.js ./

EXPOSE 3000

CMD ["server.js"]
