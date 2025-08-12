// src/utils/vector-store.js

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

// --- क्लाइंट्स को इनिशियलाइज़ करें ---
// यह सुनिश्चित करता है कि हर API कॉल पर नए क्लाइंट न बनें

// Qdrant क्लाइंट
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// OpenAI क्लाइंट (केवल एम्बेडिंग के लिए)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- हेल्पर फंक्शन्स ---

/**
 * टेक्स्ट को वेक्टर एम्बेडिंग में बदलता है।
 * @param {string} text - इनपुट टेक्स्ट।
 * @returns {Promise<number[]>} - 1536 डाइमेंशन का वेक्टर।
 */
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, ' '), // नई लाइनों को हटा दें
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error getting embedding from OpenAI:", error);
    throw new Error("Could not create text embedding.");
  }
}

/**
 * Qdrant में एक नया कलेक्शन बनाता है अगर वह मौजूद नहीं है।
 * @param {string} collectionName - कलेक्शन का नाम।
 */
async function ensureCollectionExists(collectionName) {
  try {
    // getCollections() API Vercel पर कभी-कभी धीमी हो सकती है,
    // इसलिए हम सीधे get() का उपयोग try-catch में करते हैं।
    await qdrantClient.getCollection(collectionName);
  } catch (error) {
    // अगर कलेक्शन नहीं मिलता है, तो 'Not Found' एरर आता है।
    if (error.status === 404) {
      console.log(`Collection "${collectionName}" not found. Creating it...`);
      await qdrantClient.createCollection(collectionName, {
        vectors: { 
          size: 1536, // OpenAI 'text-embedding-ada-002' का साइज़
          distance: 'Cosine' 
        },
      });
      console.log(`Collection "${collectionName}" created successfully.`);
    } else {
      // कोई और एरर हो तो उसे फेंक दें
      throw error;
    }
  }
}

// --- एक्सपोर्ट किए जाने वाले मुख्य फंक्शन्स ---

/**
 * दिए गए प्रॉम्प्ट के आधार पर पुरानी बातचीत से प्रासंगिक संदर्भ प्राप्त करता है।
 * @param {string} prompt - यूजर का वर्तमान सवाल।
 * @param {string} sessionId - यूजर का यूनिक सेशन आईडी।
 * @returns {Promise<string>} - AI को देने के लिए तैयार कॉन्टेक्स्ट स्ट्रिंग।
 */
export async function getContextFromHistory(prompt, sessionId) {
  const collectionName = `chat_${sessionId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  
  try {
    await ensureCollectionExists(collectionName);
    
    const queryEmbedding = await getEmbedding(prompt);
    
    const searchResult = await qdrantClient.search(collectionName, {
      vector: queryEmbedding,
      limit: 5, // पिछले 5 सबसे मिलते-जुलते मैसेज
      with_payload: true,
    });

    if (searchResult.length === 0) {
      return ""; // कोई पुरानी बातचीत नहीं मिली
    }

    const relevantHistory = searchResult.map(result => result.payload.content).join("\n");
    return `Here is some relevant context from our previous conversation:\n"""\n${relevantHistory}\n"""`;

  } catch (error) {
    console.error("Error retrieving context from Qdrant:", error);
    // अगर कोई एरर आता है, तो खाली कॉन्टेक्स्ट लौटाएं ताकि ऐप क्रैश न हो।
    return ""; 
  }
}

/**
 * नई बातचीत (यूजर प्रॉम्प्ट और AI जवाब) को Qdrant में सहेजता है।
 * @param {string} userPrompt - यूजर का सवाल।
 * @param {string} aiResponse - AI का जवाब।
 * @param {string} sessionId - यूजर का यूनिक सेशन आईडी।
 */
export async function saveToHistory(userPrompt, aiResponse, sessionId) {
  const collectionName = `chat_${sessionId.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  try {
    await ensureCollectionExists(collectionName);

    // दोनों के लिए एम्बेडिंग बनाएं
    const userEmbedding = await getEmbedding(userPrompt);
    const aiEmbedding = await getEmbedding(aiResponse);

    // Qdrant में पॉइंट्स को 'upsert' करें
    await qdrantClient.upsert(collectionName, {
      wait: true, // सुनिश्चित करें कि ऑपरेशन पूरा हो गया है
      points: [
        { 
          id: uuidv4(), 
          vector: userEmbedding, 
          payload: { content: `User: ${userPrompt}`, timestamp: new Date().toISOString() } 
        },
        { 
          id: uuidv4(), 
          vector: aiEmbedding, 
          payload: { content: `AI: ${aiResponse}`, timestamp: new Date().toISOString() }
        },
      ],
    });
    console.log(`Saved conversation to collection: ${collectionName}`);

  } catch (error) {
    console.error("Error saving history to Qdrant:", error);
  }
}