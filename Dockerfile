# Usa una imagen base de Node.js. Puedes ajustar la versión si es necesario.
FROM node:18-bullseye-slim 

# Establece el directorio de trabajo
WORKDIR /app

# Instala dependencias necesarias para Playwright y el entorno gráfico virtual
# Actualiza la lista de paquetes e instala xvfb y las librerías gráficas comunes para Playwright
RUN apt-get update && apt-get install -y \
    xvfb \
    # Dependencias gráficas que Playwright a menudo necesita
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libasound2-plugins \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libasound2-dev \
    libgbm-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxext-dev \
    libxi-dev \
    libxrandr-dev \
    libxtst-dev \
    # Asegura que las fuentes sean también instaladas para evitar problemas con el renderizado
    fonts-liberation \
    # Limpia los caches de apt para reducir el tamaño de la imagen
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copia package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias de Node.js, incluyendo playwright
RUN npm install

# Copia el resto de tu código de aplicación
COPY . .

# El comando para ejecutar tu aplicación debe usar xvfb
# Asegúrate de que 'server.js' sea tu archivo principal que inicia el servidor Express
CMD ["xvfb-run", "node", "server.js"]