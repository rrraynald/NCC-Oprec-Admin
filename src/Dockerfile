# Build
FROM node:20-alpine AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

# Production
FROM node:20-alpine
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/ ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "index.js"]