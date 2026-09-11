# ---------- 构建阶段：装依赖 + 构建前端 ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js index.html ./
COPY public ./public
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------- 运行阶段：Express 托管 API + dist ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5273 \
    PAD_DB=/data/pad-watchdog.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server
COPY src/rules.js ./src/rules.js
EXPOSE 5273
CMD ["node", "server/index.js"]
