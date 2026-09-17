FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
RUN mkdir -p /app/storage/media

ENV MEDIA_STORAGE_ROOT=/app/storage/media
VOLUME ["/app/storage/media"]

EXPOSE 3000
CMD ["node", "dist/server.js"]
