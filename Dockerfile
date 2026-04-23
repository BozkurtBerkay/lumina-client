# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build assets
COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config template for SPA routing and dynamic PORT
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Let the official Nginx entrypoint handle env mapping and running
