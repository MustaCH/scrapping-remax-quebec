// index.js
const express = require('express');
const { scrapeRemaxQuebec, getTotalProperties } = require('./scraper'); // Asegúrate de que la ruta sea correcta

const app = express();
// Puedes cambiar el puerto a 8080 si 3001 ya está en uso por n8n u otro proceso
const port = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración básica de CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite cualquier origen
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Endpoint para obtener el total de propiedades de una operación
app.get('/api/total', async (req, res) => {
    try {
        const queryType = req.query.type;
        const operationId = parseInt(req.query.operationId);

        let operationType;

        if (queryType === 'for-sale') {
            operationType = 'for-sale';
        } else if (queryType === 'for-rent') {
            operationType = 'for-rent';
        } else if (operationId === 1) {
            operationType = 'for-sale';
        } else if (operationId === 2) {
            operationType = 'for-rent';
        } else {
            console.warn(`Tipo de operación no especificado o inválido ('${queryType}', operationId: ${operationId}). Usando "for-sale" por defecto.`);
            operationType = 'for-sale'; 
        }

        console.log(`🔍 Obteniendo total de propiedades para operación: ${operationType}`);
        const result = await getTotalProperties(operationType);
        
        res.status(result.success ? 200 : 500).json(result);

    } catch (err) {
        console.error('❌ Error crítico en la ruta /api/total:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint para iniciar el scraping
app.get('/api/scrape', async (req, res) => {
    try {
        const queryType = req.query.type;
        const operationId = parseInt(req.query.operationId);
        const startIndex = parseInt(req.query.startIndex);
        const endIndex = parseInt(req.query.endIndex);

        let operationType;

        if (queryType === 'for-sale') {
            operationType = 'for-sale';
        } else if (queryType === 'for-rent') {
            operationType = 'for-rent';
        } else if (operationId === 1) {
            operationType = 'for-sale';
        } else if (operationId === 2) {
            operationType = 'for-rent';
        } else {
            console.warn(`Tipo de operación inválido ('${queryType}', operationId: ${operationId}). Usando "for-sale" por defecto.`);
            operationType = 'for-sale'; 
        }

        console.log(`🚀 Iniciando scraping para operación: ${operationType} | Rango: ${startIndex} - ${endIndex}`);

        const properties = await scrapeRemaxQuebec(operationType, { startIndex, endIndex });

        res.status(200).json({ success: true, data: properties });

    } catch (err) {
        console.error('❌ Error crítico en la ruta /api/scrape:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});



// Inicia el servidor Express
app.listen(port, () => {
    console.log(`🚀 Servidor de scraping escuchando en el puerto ${port}.`);
});