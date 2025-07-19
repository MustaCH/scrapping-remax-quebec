# Usar imagen oficial de Playwright con Node.js
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Instalar dependencias adicionales del sistema
RUN apt-get update && apt-get install -y \
    xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno
ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV DISPLAY=:99

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos del proyecto
COPY . .

# Instalar dependencias de Node.js
RUN npm install

# Exponer puerto si es necesario
EXPOSE 3000

# Comando para ejecutar con Xvfb
CMD ["sh", "-c", "Xvfb :99 -ac -screen 0 1280x720x16 & npm start"]