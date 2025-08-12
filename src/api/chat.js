// src/api/chat.js

import formidable from 'formidable';
import { callOpenAI, callOpenRouter, callGemini } from '../utils/ai-services.js';
import { extractTextFromFile } from '../utils/file-extractor.js';
import { getContextFromHistory, saveToHistory } from '../utils/vector-store.js';

export const config = {
    api: {
        bodyParser: false, // formidable इसे संभालेगा
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        // फ्रंटएंड से डेटा निकालें
        const prompt = fields.prompt[0];
        const sessionId = fields.sessionId[0];
        const modelType = fields.modelType[0] || 'openai'; // डिफ़ॉल्ट मॉडल
        const uploadedFile = files.file ? files.file[0] : null;

        let aiResponse = '';
        let context = '';
        let finalPrompt = prompt;

        // स्टेप 1: यदि यह एक सतत बातचीत है, तो पुराना संदर्भ प्राप्त करें
        if (sessionId) {
            context = await getContextFromHistory(prompt, sessionId);
        }

        if (uploadedFile) {
            // --- केस 1: फाइल एनालिसिस ---
            console.log("Analyzing file with OpenRouter...");
            const fileContent = await extractTextFromFile(uploadedFile);
            finalPrompt = `Based on the following document, answer the user's question.\n\nDocument Content:\n"""${fileContent}"""\n\nUser's Question: "${prompt}"`;
            
            // फाइल एनालिसिस के लिए हमेशा OpenRouter का उपयोग करें
            aiResponse = await callOpenRouter([{ role: 'user', content: finalPrompt }]);
            
        } else {
            // --- केस 2: सामान्य बातचीत ---
            finalPrompt = `${context}\n\nUser Question: ${prompt}`;
            
            switch (modelType) {
                case 'gemini':
                    console.log("Using Gemini for chat...");
                    aiResponse = await callGemini(finalPrompt);
                    break;
                case 'openrouter':
                     console.log("Using OpenRouter for chat...");
                     aiResponse = await callOpenRouter([{ role: 'user', content: finalPrompt }]);
                     break;
                case 'openai':
                default:
                    console.log("Using OpenAI for chat...");
                    aiResponse = await callOpenAI([{ role: 'user', content: finalPrompt }]);
                    break;
            }
        }

        // स्टेप 2: नई बातचीत को वेक्टर स्टोर में सेव करें
        if (sessionId) {
            await saveToHistory(prompt, aiResponse, sessionId);
        }

        res.status(200).json({ text: aiResponse });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ message: 'Error processing your request', details: error.message });
    }
}