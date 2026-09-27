# Usamos una imagen ligera de Node.js
FROM node:18-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos archivos de dependencias
COPY package.json package-lock.json ./

# Instalamos dependencias de producción
RUN npm install --production --legacy-peer-deps --ignore-scripts

RUN npm rebuild bcrypt

# Copiamos el resto del código del backend
COPY src/ ./src/
COPY server.js ./

USER node 

# Puerto que expone Express
EXPOSE 4000

# Comando para arrancar la aplicación
CMD ["node", "server.js"]