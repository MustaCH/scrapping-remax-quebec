# Usa una imagen base de Node.js. Puedes ajustar la versión si es necesario.
FROM node:18-bullseye-slim 

# Establece el directorio de trabajo
WORKDIR /app

# Instala dependencias necesarias para Playwright y el entorno gráfico virtual
# apt-get update && apt-get install -y xvfb ... son comandos para sistemas basados en Debian/Ubuntu
RUN apt-get update && apt-get install -y \
    xvfb \
    # Asegúrate de instalar todas las dependencias de Playwright si hay problemas.
    # A veces, estas dependencias ya están incluidas en la imagen base de Playwright,
    # pero si te da errores de dependencias faltantes, puede que necesites añadir más aquí.
    # Por ejemplo: libatk-bridge2.0-0 libatk1.0-0 libdrm2 libgtk-3-0 libgbm1 libasound2
    # Puedes verificar la documentación de Playwright para dependencias de sistemas headless.
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