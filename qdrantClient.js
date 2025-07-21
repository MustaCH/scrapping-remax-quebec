// qdrantClient.js
const { axios } = require('axios');
const { dotenv} = require('dotenv');
const { getEmbedding } = require('./embedder.js');

dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL
const COLLECTION = 'rmax_QUEBEC_properties';

function buildText(property) {
  return `Title: ${property.title}. Price: ${property.price}. Address: ${property.address}. ` +
    `Bedrooms: ${property.bedrooms}. Bathrooms: ${property.bathrooms}. Toilets: ${property.toilets}. ` +
    `Built Area: ${property.surfaceBuilt}. Land Area: ${property.surfaceLand}. ` +
    `Type of operation: ${property.operation}. URL: ${property.url}`;
}

export async function embedAndStoreProperties(properties) {
  const vectors = [];

  for (const prop of properties) {
    const text = buildText(prop);
    const vector = await getEmbedding(text);

    vectors.push({
      id: prop.url,
      vector,
      payload: {
        ...prop,
        text
      }
    });
  }

  await axios.put(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
    points: vectors
  });

  console.log(`✅ Successfully stored ${vectors.length} vectors in Qdrant.`);
}
