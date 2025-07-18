const express = require('express');
const { scrapeRemaxQuebec } = require('./scraper'); // Asegúrate de que el scraper exporta la función así

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/api/scrape', async (req, res) => {
    try {
        // Determinar el tipo de operación: 'for-sale' o 'for-rent'
        // Puedes usar un parámetro 'type' en la query, o seguir usando 'operationId'
        // Mapeamos operationId a los strings esperados por scrapeRemaxQuebec
        const operationId = parseInt(req.query.operationId); // 1 para venta, 2 para alquiler (asumiendo)
        const queryType = req.query.type; // Parámetro opcional para ser más explícito

        let operationType;
        if (queryType === 'for-sale' || operationId === 1) {
            operationType = 'for-sale';
        } else if (queryType === 'for-rent' || operationId === 2) {
            operationType = 'for-rent';
        } else {
            // Valor por defecto si no se especifica o es inválido, o manejar como error
            console.warn('Tipo de operación no especificado o inválido. Usando "for-sale" por defecto.');
            operationType = 'for-sale'; 
            // O podrías devolver un error:
            // return res.status(400).json({ success: false, error: 'Parámetro "type" u "operationId" inválido. Use "for-sale" o "for-rent".' });
        }

        console.log(`🚀 Iniciando scraping para la operación: ${operationType}`);
        
        // Llama a la función del scraper que ahora maneja todas las páginas
        const properties = await scrapeRemaxQuebec(operationType);
        
        return res.status(200).json({ success: true, data: properties });

    } catch (err) {
        console.error('❌ Error crítico en la ruta /api/scrape:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});


app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${port}.`);
});