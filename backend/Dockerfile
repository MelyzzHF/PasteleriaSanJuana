# Usamos una imagen ligera de Node.js
FROM node:18-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias de producción (SOLO npm ci)
RUN npm ci --production --legacy-peer-deps --ignore-scripts

# Reconstruimos dependencias nativas
RUN npm rebuild bcrypt

# Copiamos el resto del código del backend
COPY src/ ./src/
COPY server.js ./

# Bajamos los privilegios por seguridad
USER node 

# Puerto que expone Express
EXPOSE 4000

# Comando para arrancar la aplicación
CMD ["node", "server.js"]