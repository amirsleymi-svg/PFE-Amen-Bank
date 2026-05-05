# Base for building
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Base for serving
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
# If the build output path is different, adjust /app/dist/frontend/browser
# Usually Angular 17+ uses dist/project-name/browser
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
