# Etapa 1: build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: nginx
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf && \
    printf "server {\n\
      listen 80;\n\
      root /usr/share/nginx/html;\n\
      index index.html;\n\
      location / {\n\
        try_files \$uri \$uri/ /index.html;\n\
      }\n\
    }\n" > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
