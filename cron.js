import { scrapeRemaxQuebec } from './scraper.js';

(async () => {
  try {
    await scrapeRemaxQuebec('for-sale');
    await scrapeRemaxQuebec('for-rent');
  } catch (err) {
    console.error('❌ Error during scheduled scraping:', err);
    process.exit(1);
  }
})();
