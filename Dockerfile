# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*

# Copy build assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (with RAILWAY_PORT placeholder)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script and make it executable
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/bin/sh", "/start.sh"]
