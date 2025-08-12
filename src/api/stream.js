
// src/api/stream.js - Server-Sent Events for streaming responses

import { callOpenAI, callOpenRouter, callGemini } from '../utils/ai-services.js';
import { getContextFromHistory } from '../utils/vector-store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    // SSE Headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
        const { prompt, sessionId, modelType = 'openai' } = req.body;
        
        let context = '';
        let finalPrompt = prompt;

        // Get conversation context if session exists
        if (sessionId) {
            context = await getContextFromHistory(prompt, sessionId);
            finalPrompt = `${context}\n\nUser Question: ${prompt}`;
        }

        // Get AI response based on model type
        let aiResponse = '';
        switch (modelType) {
            case 'gemini':
                aiResponse = await callGemini(finalPrompt);
                break;
            case 'openrouter':
                aiResponse = await callOpenRouter([{ role: 'user', content: finalPrompt }]);
                break;
            case 'openai':
            default:
                aiResponse = await callOpenAI([{ role: 'user', content: finalPrompt }]);
                break;
        }

        // Stream response word by word
        const words = aiResponse.split(' ');
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLast = i === words.length - 1;
            
            // Send word with space (except for last word)
            const chunk = isLast ? word : word + ' ';
            
            res.write(`data: ${JSON.stringify({ 
                type: 'chunk', 
                content: chunk,
                isComplete: isLast 
            })}\n\n`);
            
            // Add natural typing delay
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            fullResponse: aiResponse 
        })}\n\n`);

    } catch (error) {
        console.error('SSE Stream Error:', error);
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Error processing request: ' + error.message 
        })}\n\n`);
    } finally {
        res.end();
    }
}
