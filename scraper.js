const { chromium } = require('playwright');

const launchOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process'
    ]
};

async function getTotalProperties(operationType = 'for-sale') {
    let browser;
    let page;

    try {
        console.log(`🔍 Obteniendo total de propiedades para operación: ${operationType}`);
        browser = await chromium.launch({ headless: false, ...launchOptions }); // Cambia a true para producción
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
        });

        page = await context.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        });

        const url = `https://www.remax-quebec.com/en/${operationType}`;
        console.log(`🔍 Navegando a: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

         const cookieButtonSelector = '#didomi-notice-agree-button';
        console.log(`scrapeRemaxQuebec: Buscando botón de cookies: ${cookieButtonSelector}`);
        
        try {
            await page.waitForSelector(cookieButtonSelector, { state: 'visible', timeout: 15000 });
            console.log("scrapeRemaxQuebec: Botón de cookies encontrado. Haciendo clic...");
            await page.click(cookieButtonSelector);
            await page.waitForTimeout(2000); 
            console.log("scrapeRemaxQuebec: Clic en botón de cookies realizado.");
        } catch (cookieError) {
            console.warn(`⚠️ scrapeRemaxQuebec: No se encontró o no se pudo hacer clic en el botón de cookies (${cookieError.message}). Esto puede ser normal si ya se aceptaron o no aparecen.`);
        }

        const containerSelector = '.results-lists';
        console.log(`⏳ Esperando que aparezca el contenedor "${containerSelector}"...`);
        await page.waitForSelector(containerSelector, { timeout: 15000 });
        console.log(`✅ Contenedor "${containerSelector}" encontrado.`);
        await page.waitForSelector('.results-lists__header h1 span.count', { timeout: 10000 });
        console.log(`⏳ Esperando que aparezca el total de propiedades...`);
        // Usamos regex sobre el H1 directamente, como backup robusto
        const h1Text = await page.$eval('.results-lists__header h1 span.count', el => el.innerText);
        const match = h1Text.match(/\d[\d,\.]*/);
        const total = match ? parseInt(match[0].replace(/[^\d]/g, ''), 10) : null;

        if (!total) throw new Error('❌ No se pudo extraer el número total');

        await browser.close();
        console.log(`✅ Total encontrado para "${operationType}": ${total}`);
        return { success: true, operation: operationType, total };
    } catch (error) {
        console.error(`❌ Error al obtener el total para ${operationType}`, error);
        if (browser) await browser.close();
        return { success: false, operation: operationType, error: error.message };
    }
}



async function scrapeRemaxQuebec(operationType = 'for-sale', range = {}) {
    let browser;
    let page;
    let allProperties = new Map(); 
    const { startIndex, endIndex } = range;

    try {
        console.log("scrapeRemaxQuebec: Lanzando navegador para scraping de scroll infinito...");
        // Mantén headless: false para depuración inicial para ver el proceso
        browser = await chromium.launch({ headless: true, ...launchOptions }); 
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
        });
        page = await context.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        });

        const baseUrl = `https://www.remax-quebec.com/en/${operationType}`;
        console.log(`scrapeRemaxQuebec: Navegando a: ${baseUrl}`);
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 }); 

        const cookieButtonSelector = '#didomi-notice-agree-button';
        console.log(`scrapeRemaxQuebec: Buscando botón de cookies: ${cookieButtonSelector}`);
        
        try {
            await page.waitForSelector(cookieButtonSelector, { state: 'visible', timeout: 15000 });
            console.log("scrapeRemaxQuebec: Botón de cookies encontrado. Haciendo clic...");
            await page.click(cookieButtonSelector);
            await page.waitForTimeout(2000); 
            console.log("scrapeRemaxQuebec: Clic en botón de cookies realizado.");
        } catch (cookieError) {
            console.warn(`⚠️ scrapeRemaxQuebec: No se encontró o no se pudo hacer clic en el botón de cookies (${cookieError.message}). Esto puede ser normal si ya se aceptaron o no aparecen.`);
        }
        
        // --- Bucle de Scroll Infinito ---
        let previousScrollHeight = -1; 
        let scrollAttempt = 0;
        const MAX_SCROLL_ATTEMPTS = 500; 

        const PROPERTY_ITEM_SELECTOR = 'a.card.card-property-thumbnail';
        const SCROLLABLE_CONTAINER_SELECTOR = 'aside'; 
        
        console.log("scrapeRemaxQuebec: Iniciando bucle de scroll infinito...");

        while (scrollAttempt < MAX_SCROLL_ATTEMPTS) {
            scrollAttempt++;
            console.log(`scrapeRemaxQuebec: Intento de scroll #${scrollAttempt}.`);

            const currentScrollHeight = await page.evaluate((selector) => {
                const scrollableElement = document.querySelector(selector);
                if (scrollableElement) {
                    scrollableElement.scrollTop = scrollableElement.scrollHeight;
                    return scrollableElement.scrollHeight;
                }
                return -1; 
            }, SCROLLABLE_CONTAINER_SELECTOR);

            if (currentScrollHeight === -1) {
                console.error(`❌ Error: No se encontró el contenedor scrollable con el selector: ${SCROLLABLE_CONTAINER_SELECTOR}. Asegúrate de que existe y es scrollable.`);
                break;
            }
            
            await page.waitForTimeout(2500); 

            if (currentScrollHeight === previousScrollHeight && scrollAttempt > 1) { 
                const currentPropertiesOnPage = await page.$$(PROPERTY_ITEM_SELECTOR);
                if (currentPropertiesOnPage.length === allProperties.size) {
                    console.log("✅ scrapeRemaxQuebec: La altura del scroll no cambió y no se encontraron nuevas propiedades en el DOM. Fin de la lista.");
                    break;
                }
            }
            previousScrollHeight = currentScrollHeight; 

            const currentPropertiesHandles = await page.$$(PROPERTY_ITEM_SELECTOR);
            let propertiesAddedThisScroll = 0;

            for (const handle of currentPropertiesHandles) {
                const propertyUrl = await handle.getAttribute('href');

                if (propertyUrl && !allProperties.has(propertyUrl)) {
                    const fullPropertyUrl = propertyUrl.startsWith('http') ? propertyUrl : `https://www.remax-quebec.com${propertyUrl}`;

                  
                    const title = await handle.$eval('div.card-body .property-listing-details .property-details--title', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    const price = await handle.$eval('div.card-footer .property-details .property-details--price', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    const address = await handle.$eval('div.card-body .property-listing-details .property-details--address', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    const bedrooms = await handle.$eval('span[aria-label="bed icon"] + label', el => parseInt(el.textContent.trim().match(/\d+/)?.[0]) || 0).catch(() => 0);
                    const bathrooms = await handle.$eval('span[aria-label="bath icon"] + label', el => parseInt(el.textContent.trim().match(/\d+/)?.[0]) || 0).catch(() => 0);
                    const toilets = await handle.$eval('span[aria-label="toilet icon"] + label', el => parseInt(el.textContent.trim().match(/\d+/)?.[0]) || 0).catch(() => 0);
                    
                    const surfaceBuilt = await handle.$eval('span[aria-label="door-open icon"] + label', el => el.textContent.trim()).catch(() => 'No disponible');
                    
                    const surfaceLandElement = await handle.$('span[aria-label="trees icon"] + label');
                    const surfaceLand = surfaceLandElement ? await surfaceLandElement.evaluate(el => el.textContent.trim()) : 'No disponible';
                    
                    const newProperty = {
                        url: fullPropertyUrl,
                        title,
                        price,
                        address,
                        bedrooms,
                        bathrooms,
                        toilets,
                        surfaceLand, 
                        surfaceBuilt, 
                        operation: operationType === 'for-sale' ? 'Venta' : 'Alquiler',
                    };
                    allProperties.set(fullPropertyUrl, newProperty);
                    propertiesAddedThisScroll++;
                }
            }
            
            console.log(`  -> Propiedades únicas añadidas en este scroll: ${propertiesAddedThisScroll}. Total de propiedades únicas extraídas HASTA AHORA: ${allProperties.size}`);
            
            if (typeof endIndex === 'number' && allProperties.size > endIndex) {
                console.log(`✅ Ya se recolectaron más de ${endIndex} propiedades. Deteniendo scroll anticipadamente.`);
                break;
            }
            
            if (propertiesAddedThisScroll === 0 && scrollAttempt > 1) { 
                console.log("✅ scrapeRemaxQuebec: No se encontraron nuevas propiedades únicas después de este scroll. Asumiendo el final de la lista.");
                break; 
            }

            if (scrollAttempt === MAX_SCROLL_ATTEMPTS) {
                console.warn(`⚠️ scrapeRemaxQuebec: Se alcanzó el límite de intentos de scroll (${MAX_SCROLL_ATTEMPTS}). Podrían quedar más propiedades.`);
                break; 
            }
        }
        console.log("scrapeRemaxQuebec: Bucle de scroll infinito finalizado.");
        await browser.close(); 

        const finalMappedProperties = Array.from(allProperties.values()); 

        const slicedProperties = (typeof startIndex === 'number' && typeof endIndex === 'number')
            ? finalMappedProperties.slice(startIndex, endIndex + 1)
            : finalMappedProperties;

        console.log(`✅ scrapeRemaxQuebec: Proceso completado. Total de propiedades únicas extraídas: ${finalMappedProperties.length}`);
        console.log(`📦 Devolviendo ${slicedProperties.length} propiedades${startIndex !== undefined ? ` (rango ${startIndex}-${endIndex})` : ''}`);
        return slicedProperties;

    } catch (error) {
        console.error(`❌ scrapeRemaxQuebec: Error fatal en scrapeRemaxQuebec:`, error);
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

module.exports = { scrapeRemaxQuebec, getTotalProperties };