# Usamos una imagen ligera de Node.js
FROM node:18-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias de producción
RUN npm ci --production --legacy-peer-deps --ignore-scripts
# Copiamos el resto del código del backend
COPY . .

# Puerto que expone Express
EXPOSE 4000

# Comando para arrancar la aplicación
CMD ["node", "server.js"]