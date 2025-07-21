// index.js
import express from 'express';
import { scrapeRemaxQuebec, getTotalProperties } from './scraper.js';
import cron from 'node-cron';

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
        // Determinar el tipo de operación: 'for-sale' o 'for-rent'
        // Prioriza el parámetro 'type' si está presente.
        const queryType = req.query.type;
        const operationId = parseInt(req.query.operationId); // 1 para venta, 2 para alquiler (asumiendo)

        let operationType;

        if (queryType === 'for-sale') {
            operationType = 'for-sale';
        } else if (queryType === 'for-rent') {
            operationType = 'for-rent';
        } else if (operationId === 1) { // Si 'type' no está o es inválido, intenta con operationId
            operationType = 'for-sale';
        } else if (operationId === 2) {
            operationType = 'for-rent';
        } else {
            // Si ninguno de los anteriores se especifica o es válido, usar un valor por defecto y avisar.
            console.warn(`Tipo de operación no especificado o inválido ('${queryType}', operationId: ${operationId}). Usando "for-sale" por defecto.`);
            operationType = 'for-sale'; 
        }

        console.log(`🚀 Iniciando scraping para la operación: ${operationType}`);
        
        // Llama a la función del scraper que ahora maneja todas las páginas y selectores
        const properties = await scrapeRemaxQuebec(operationType);
        
        // Envía la respuesta con los datos extraídos
        res.status(200).json({ success: true, data: properties });

    } catch (err) {
        console.error('❌ Error crítico en la ruta /api/scrape:', err);
        // Envía una respuesta de error al cliente
        res.status(500).json({ success: false, error: err.message });
    }
});

// ⏰ Ejecutar todos los días a las 00:00
cron.schedule('0 0 * * *', async () => {
    console.log("⏰ Ejecutando scrapping diario para 'for-sale' y 'for-rent'");
    try {
        await scrapeRemaxQuebec('for-sale');
        await scrapeRemaxQuebec('for-rent');
        console.log("✅ Scraping diario completado");
    } catch (err) {
        console.error("❌ Error durante el scraping diario:", err);
    }
});

// Inicia el servidor Express
app.listen(port, () => {
    console.log(`🚀 Servidor de scraping escuchando en el puerto ${port}.`);
});