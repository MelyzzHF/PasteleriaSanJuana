#Compilar la aplicación de React/Vite con Node 20
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

#Servir los archivos estáticos con Nginx
FROM nginx:alpine

# Copiamos los archivos compilados al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]