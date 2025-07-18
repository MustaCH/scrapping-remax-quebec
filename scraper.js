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

async function scrapeRemaxQuebec(operationType = 'for-sale') {
    let browser;
    let page;
    let allProperties = new Map(); // Usaremos un Map para almacenar propiedades únicas por su URL

    try {
        console.log("scrapeRemaxQuebec: Lanzando navegador para scraping de scroll infinito...");
        // Mantén headless: false para depuración inicial para ver el proceso
        browser = await chromium.launch({ headless: true, ...launchOptions }); 
        page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        });

        const baseUrl = `https://www.remax-quebec.com/en/${operationType}`;
        console.log(`scrapeRemaxQuebec: Navegando a: ${baseUrl}`);
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 }); 

        const cookieButtonSelector = '#didomi-notice-agree-button';
        console.log(`scrapeRemaxQuebec: Buscando botón de cookies: ${cookieButtonSelector}`);
        
        try {
            await page.waitForSelector(cookieButtonSelector, { state: 'visible', timeout: 15000 });
            consolei.log("scrapeRemaxQuebec: Botón de cookies encontrado. Haciendo clic...");
            await page.click(cookieButtonSelector);
            await page.waitForTimeout(2000); // Dar tiempo para que el pop-up se cierre y la página se asiente
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

                    // --- SELECTORES REVERTIDOS A LOS MÁS SIMPLES QUE DEBERÍAN FUNCIONAR DENTRO DEL HANDLE ---
                    // El problema es que estos selectores no son descendientes directos del handle `a.card.card-property-thumbnail`.
                    // Necesitamos especificar la ruta desde el handle hasta ellos.
                    // Según el HTML que me proporcionaste:
                    // - title y address están dentro de .card-wrapper > .card-body > .property-listing-details > ul.property-listing-info
                    // - price está dentro de .card-wrapper > .card-footer > .property-details

                    // Título
                    const title = await handle.$eval('div.card-body .property-listing-details .property-details--title', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    // Precio
                    const price = await handle.$eval('div.card-footer .property-details .property-details--price', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    // Dirección
                    const address = await handle.$eval('div.card-body .property-listing-details .property-details--address', el => el.textContent.trim()).catch(() => 'N/A');
                    
                    // Iconos (bedrooms, bathrooms, toilets, surfaceBuilt) y Superficie Terreno
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

        console.log(`✅ scrapeRemaxQuebec: Proceso completado. Total de propiedades únicas extraídas: ${finalMappedProperties.length}`);
        return finalMappedProperties;

    } catch (error) {
        console.error(`❌ scrapeRemaxQuebec: Error fatal en scrapeRemaxQuebec:`, error);
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

module.exports = { scrapeRemaxQuebec };