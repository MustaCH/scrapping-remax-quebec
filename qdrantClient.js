// qdrantClient.js
import axios from 'axios';
import dotenv from 'dotenv';
import { getEmbedding } from './embedder.js';
import { randomUUID } from 'crypto'; // ✅ IMPORTANTE: Se importa para generar IDs únicos

dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL
const COLLECTION = 'rmax_QUEBEC_properties';
const BATCH_SIZE = 100;

function buildText(property) {
  return `Title: ${property.title}. Price: ${property.price}. Address: ${property.address}. ` +
    `Bedrooms: ${property.bedrooms}. Bathrooms: ${property.bathrooms}. Toilets: ${property.toilets}. ` +
    `Built Area: ${property.surfaceBuilt}. Land Area: ${property.surfaceLand}. ` +
    `Type of operation: ${property.operation}. URL: ${property.url}`;
}

// ✅ Nueva función para crear la colección si no existe
async function verifyCollection() {
  try {
    await axios.get(`${QDRANT_URL}/collections/${COLLECTION}`);
    console.log(`📦 La colección '${COLLECTION}' ya existe.`);
    // ❌ Vacía la colección eliminando todos los puntos
    console.log(`🧹 Eliminando todos los puntos de la colección '${COLLECTION}'...`);
    await axios.post(`${QDRANT_URL}/collections/${COLLECTION}/points/delete`, {
      filter: {} 
    });
    console.log(`✅ Todos los puntos eliminados de la colección '${COLLECTION}'.`);
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`📦 La colección '${COLLECTION}' no existe. Creándola...`);
      await axios.put(`${QDRANT_URL}/collections/${COLLECTION}`, {
        vectors: {
          size: 1536, // Tamaño de embedding de text-embedding-3-small
          distance: 'Cosine'
        }
      });
      console.log(`✅ Colección '${COLLECTION}' creada correctamente.`);
    } else {
      console.error(`❌ Error al verificar o crear la colección:`, err.response?.data || err.message);
      throw err;
    }
  }
}


export async function embedAndStoreProperties(properties) {
    // Verificar o crear la colección antes de procesar las propiedades
    await verifyCollection();

    const vectors = [];

    for (const prop of properties) {
        const text = buildText(prop);
        const vector = await getEmbedding(text);

        vectors.push({
        id: randomUUID(), // Genera un ID único para cada punto
        vector,
        payload: {
            ...prop,
            text
        }
        });

    // INSPECCIÓN TEMPORAL PARA DEBUG
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        try {
            // ✅ Mostrar la forma del primer punto del batch
            console.log("🔍 Ejemplo de punto enviado a Qdrant:");
            console.dir(batch[0], { depth: null });

            await axios.put(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
            points: batch
            });

            console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} enviado con éxito (${batch.length} puntos).`);
        } catch (error) {
            console.error(`❌ Error al enviar el batch #${Math.floor(i / BATCH_SIZE) + 1}:`, error.response?.data || error.message);
        }
    }

  }

  await axios.put(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
    points: vectors
  });

  console.log(`✅ Successfully stored ${vectors.length} vectors in Qdrant.`);
}
