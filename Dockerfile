# Usar imagen oficial de Playwright con Node.js
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    xvfb \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno
ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV DISPLAY=:99

# Crear usuario no root para seguridad
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
    && mkdir -p /home/playwright/Downloads \
    && chown -R playwright:playwright /home/playwright

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Cambiar ownership del directorio de trabajo
RUN chown -R playwright:playwright /usr/src/app

# Cambiar a usuario no root
USER playwright

# Copiar archivos del proyecto
COPY --chown=playwright:playwright . .

# Instalar dependencias
RUN npm install

# Instalar navegadores de Playwright (si no están en la imagen base)
RUN npx playwright install chromium || echo "Navegadores ya instalados"

# Exponer puerto si es necesario
EXPOSE 3000

# Script de inicio que configura Xvfb y ejecuta la aplicación
CMD ["sh", "-c", "Xvfb :99 -ac -screen 0 1280x720x16 & npm start"]