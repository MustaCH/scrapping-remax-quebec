// embedder.js
import { axios } from 'axios';
import { dotenv } from 'dotenv';


dotenv.config();

const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;

export async function getEmbedding(text) {
  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    {
      input: text,
      model: 'text-embedding-3-small'
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.data[0].embedding;
}
