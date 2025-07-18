FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Instala Xvfb para tener entorno gráfico virtual
RUN apt-get update && apt-get install -y \
    xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crea directorio de trabajo
WORKDIR /usr/src/app

# Copia archivos del proyecto
COPY . .

# Instala dependencias
RUN npm install

# Expone el puerto si tu app tiene frontend (opcional)
EXPOSE 3000

# Comando para ejecutar el script con entorno gráfico
CMD ["sh", "-c", "xvfb-run --auto-servernum --server-args='-screen 0 1280x720x24' npm start"]
