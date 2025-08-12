// api/chat.js - AI Nexus Studio Backend API (पूर्ण अपग्रेडेड वर्जन)

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { QdrantClient } from "@qdrant/js-client-rest";
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// === कॉन्फ़िगरेशन सेटअप ===
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Qdrant कनेक्शन
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
});

// सुरक्षा सेटिंग्स
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

// === हेल्पर फंक्शन्स ===

/**
 * टेक्स्ट के लिए एम्बेडिंग जेनरेट करता है
 */
async function getEmbedding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('एम्बेडिंग जेनरेट करने में त्रुटि:', error);
        throw new Error('एम्बेडिंग सेवा अनुपलब्ध है');
    }
}

/**
 * URL से फाइल डाउनलोड करके उसका टेक्स्ट निकालता है
 */
async function extractTextFromUrl(fileUrl, fileType) {
    try {
        console.log(`🔍 फाइल का विश्लेषण शुरू: ${fileUrl}`);
        
        const response = await fetch(fileUrl, {
            headers: {
                'User-Agent': 'AI-Nexus-Studio/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`फाइल डाउनलोड नहीं हो सकी: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(buffer);
        
        return await extractTextFromBuffer(nodeBuffer, fileType);
        
    } catch (error) {
        console.error(`फाइल ${fileUrl} से टेक्स्ट निकालने में त्रुटि:`, error);
        throw new Error(`फाइल प्रोसेसिंग में त्रुटि: ${error.message}`);
    }
}

/**
 * बफर से फाइल टाइप के अनुसार टेक्स्ट निकालता है
 */
async function extractTextFromBuffer(buffer, fileType) {
    try {
        if (fileType.includes('pdf')) {
            return await extractPdfText(buffer);
        } else if (fileType.includes('docx') || fileType.includes('word')) {
            return await extractDocxText(buffer);
        } else if (fileType.startsWith('text/')) {
            return buffer.toString('utf-8');
        } else if (fileType.startsWith('image/')) {
            return await extractImageText(buffer);
        } else if (fileType.includes('json')) {
            return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
        } else {
            throw new Error(`असमर्थित फाइल प्रकार: ${fileType}`);
        }
    } catch (error) {
        console.error('फाइल कंटेंट निकालने में त्रुटि:', error);
        throw error;
    }
}

/**
 * PDF से टेक्स्ट निकालता है
 */
async function extractPdfText(buffer) {
    try {
        const data = await pdf(buffer, {
            max: 50, // अधिकतम 50 पेज
        });
        
        return {
            text: data.text,
            metadata: {
                pages: data.numpages,
                info: data.info,
                wordCount: data.text.split(' ').length
            }
        };
    } catch (error) {
        throw new Error(`PDF प्रोसेसिंग त्रुटि: ${error.message}`);
    }
}

/**
 * DOCX से टेक्स्ट निकालता है
 */
async function extractDocxText(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        
        return {
            text: result.value,
            metadata: {
                wordCount: result.value.split(' ').length,
                messages: result.messages
            }
        };
    } catch (error) {
        throw new Error(`DOCX प्रोसेसिंग त्रुटि: ${error.message}`);
    }
}

/**
 * इमेज से टेक्स्ट निकालता है (OCR)
 */
async function extractImageText(buffer) {
    try {
        // इमेज को ऑप्टिमाइज़ करें OCR के लिए
        const optimizedBuffer = await sharp(buffer)
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
            .greyscale()
            .normalize()
            .toBuffer();

        const { data: { text, confidence } } = await Tesseract.recognize(
            optimizedBuffer,
            'hin+eng', // हिंदी और अंग्रेजी दोनों
            {
                logger: m => console.log(`OCR Progress: ${m.progress}`)
            }
        );
        
        return {
            text: text.trim(),
            metadata: {
                confidence: confidence,
                language: 'hin+eng'
            }
        };
    } catch (error) {
        throw new Error(`इमेज OCR त्रुटि: ${error.message}`);
    }
}

/**
 * Qdrant से संबंधित कॉन्टेक्स्ट खोजता है
 */
async function searchRelevantContext(query, collectionName, limit = 5) {
    try {
        const queryEmbedding = await getEmbedding(query);
        
        const searchResult = await qdrantClient.search(collectionName, {
            vector: queryEmbedding,
            limit: limit,
            score_threshold: 0.7
        });

        const contexts = searchResult.map(result => ({
            content: result.payload.content,
            score: result.score,
            timestamp: result.payload.timestamp
        }));

        return contexts;
    } catch (error) {
        console.error('कॉन्टेक्स्ट खोजने में त्रुटि:', error);
        return [];
    }
}

/**
 * Qdrant में कॉन्टेंट सेव करता है
 */
async function saveToQdrant(content, collectionName, metadata = {}) {
    try {
        const embedding = await getEmbedding(content);
        const pointId = Date.now().toString();

        await qdrantClient.upsert(collectionName, {
            wait: true,
            points: [{
                id: pointId,
                vector: embedding,
                payload: {
                    content: content,
                    timestamp: new Date().toISOString(),
                    ...metadata
                }
            }]
        });

        return pointId;
    } catch (error) {
        console.error('Qdrant में सेव करने में त्रुटि:', error);
        throw error;
    }
}

/**
 * AI रिस्पांस जेनरेट करता है
 */
async function generateAIResponse(prompt, model = 'gemini-pro') {
    try {
        const aiModel = genAI.getGenerativeModel({ 
            model: model,
            safetySettings: safetySettings,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.8,
                maxOutputTokens: 2048,
            }
        });

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        
        return {
            text: response.text(),
            usage: response.usage,
            safety: response.safety
        };
    } catch (error) {
        console.error('AI रिस्पांस जेनरेट करने में त्रुटि:', error);
        throw error;
    }
}

/**
 * फाइल विश्लेषण प्रॉम्प्ट बनाता है
 */
function createFileAnalysisPrompt(fileContent, userQuery, context, fileType, metadata) {
    return `आप एक विशेषज्ञ AI असिस्टेंट हैं जो फाइलों का गहरा विश्लेषण कर सकते हैं।

**पिछली बातचीत का संदर्भ:**
${context}

**फाइल की जानकारी:**
- प्रकार: ${fileType}
- आकार: ${metadata?.wordCount ? `${metadata.wordCount} शब्द` : 'अज्ञात'}
- ${metadata?.pages ? `पेज: ${metadata.pages}` : ''}

**फाइल की सामग्री:**
"""
${fileContent.substring(0, 12000)}
${fileContent.length > 12000 ? '\n\n[... फाइल में और भी सामग्री है ...]' : ''}
"""

**उपयोगकर्ता का प्रश्न:** "${userQuery}"

कृपया फाइल की सामग्री के आधार पर उपयोगकर्ता के प्रश्न का विस्तृत और सहायक उत्तर दें। यदि आवश्यक हो तो फाइल से specific quotes या examples भी दें।`;
}

/**
 * सामान्य चैट प्रॉम्प्ट बनाता है
 */
function createChatPrompt(userQuery, context) {
    return `आप एक सहायक और बुद्धिमान AI असिस्टेंट हैं।

**पिछली बातचीत का संदर्भ:**
${context}

**नया प्रश्न:** ${userQuery}

कृपया संदर्भ को ध्यान में रखते हुए उपयोगकर्ता के प्रश्न का उपयोगी और सटीक उत्तर दें।`;
}

// === Vercel Edge Function Configuration ===
export const config = {
    runtime: 'edge',
    regions: ['bom1'], // Mumbai region for better performance in India
    maxDuration: 60, // 60 seconds timeout for file processing
};

// === मुख्य API हैंडलर ===
export default async function handler(req) {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID, X-Requested-With',
        'Access-Control-Max-Age': '86400',
    };

    // OPTIONS request को handle करें
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    // केवल POST requests को allow करें
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Request body parse करें
        const requestBody = await req.json();
        const { 
            prompt, 
            sessionId, 
            model = 'gemini-pro',
            useContext = true,
            fileUrl = null,
            fileType = null,
            fileName = null,
            history = []
        } = requestBody;

        console.log(`🚀 नया अनुरोध प्राप्त हुआ: ${sessionId}`);
        console.log(`📝 प्रॉम्प्ट: ${prompt?.substring(0, 100)}...`);
        console.log(`📁 फाइल: ${fileUrl ? 'हां' : 'नहीं'}`);

        // Basic validation
        if (!prompt) {
            return new Response(JSON.stringify({
                error: 'प्रॉम्प्ट आवश्यक है',
                code: 'MISSING_PROMPT'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!sessionId) {
            return new Response(JSON.stringify({
                error: 'Session ID आवश्यक है',
                code: 'MISSING_SESSION_ID'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Collection name बनाएं
        const collectionName = `chat_${sessionId.replace(/[^a-zA-Z0-9]/g, '_')}`;

        let finalPrompt;
        let context = '';
        let fileAnalysis = null;

        // Context प्राप्त करें यदि enabled है
        if (useContext) {
            try {
                const relevantContexts = await searchRelevantContext(prompt, collectionName);
                if (relevantContexts.length > 0) {
                    context = relevantContexts
                        .map(ctx => `- ${ctx.content}`)
                        .join('\n');
                    console.log(`🧠 ${relevantContexts.length} संदर्भ मिले`);
                }
            } catch (error) {
                console.warn('कॉन्टेक्स्ट लोड करने में त्रुटि:', error);
            }
        }

        // फाइल विश्लेषण vs सामान्य चैट का निर्णय
        if (fileUrl && fileType) {
            // === फाइल विश्लेषण मोड ===
            console.log(`📄 फाइल विश्लेषण मोड: ${fileType}`);
            
            try {
                const extractedContent = await extractTextFromUrl(fileUrl, fileType);
                const contentText = typeof extractedContent === 'string' 
                    ? extractedContent 
                    : extractedContent.text;
                
                fileAnalysis = {
                    fileName: fileName || 'unknown',
                    fileType: fileType,
                    content: contentText,
                    metadata: extractedContent.metadata || {}
                };

                finalPrompt = createFileAnalysisPrompt(
                    contentText,
                    prompt,
                    context,
                    fileType,
                    extractedContent.metadata
                );

                console.log(`✅ फाइल सफलतापूर्वक प्रोसेस हुई: ${contentText.length} characters`);

            } catch (error) {
                console.error('फाइल प्रोसेसिंग त्रुटि:', error);
                
                return new Response(JSON.stringify({
                    text: `फाइल प्रोसेसिंग में त्रुटि हुई: ${error.message}

कृपया सुनिश्चित करें कि:
- फाइल URL सही है
- फाइल का आकार उचित है (< 10MB)
- फाइल फॉर्मेट समर्थित है (PDF, DOCX, TXT, Images)

आप दोबारा कोशिश कर सकते हैं या बिना फाइल के प्रश्न पूछ सकते हैं।`,
                    error: true,
                    errorType: 'FILE_PROCESSING_ERROR',
                    details: error.message
                }), {
                    status: 200, // 200 भेजें ताकि फ्रंटएंड में error message दिखे
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else {
            // === सामान्य चैट मोड ===
            console.log('💬 सामान्य चैट मोड');
            finalPrompt = createChatPrompt(prompt, context);
        }

        // AI से response जेनरेट करें
        console.log('🤖 AI response जेनरेट कर रहे हैं...');
        const aiResponse = await generateAIResponse(finalPrompt, model);

        // Response को Qdrant में save करें
        try {
            await saveToQdrant(
                `User: ${prompt}\nAI: ${aiResponse.text}`,
                collectionName,
                {
                    type: fileUrl ? 'file_analysis' : 'chat',
                    model: model,
                    hasFile: !!fileUrl,
                    fileType: fileType || null,
                    fileName: fileName || null
                }
            );
            console.log('💾 Qdrant में सफलतापूर्वक save किया गया');
        } catch (error) {
            console.warn('Qdrant save करने में त्रुटि:', error);
        }

        // Final response बनाएं
        const responseData = {
            text: aiResponse.text,
            model: model,
            contextUsed: !!context,
            relevantHistoryCount: context ? context.split('\n').length : 0,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            fileAnalyzed: !!fileUrl,
            ...(fileAnalysis && {
                fileInfo: {
                    name: fileAnalysis.fileName,
                    type: fileAnalysis.fileType,
                    size: fileAnalysis.content.length,
                    metadata: fileAnalysis.metadata
                }
            })
        };

        console.log('✅ सफलतापूर्वक response भेजा गया');

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ API Error:', error);

        const errorResponse = {
            text: `माफ करें, कुछ तकनीकी समस्या हुई है। कृपया दोबारा कोशिश करें।

**त्रुटि की जानकारी:** ${error.message}

**सुझाव:**
- थोड़ी देर बाद कोशिश करें
- अपना प्रश्न छोटा करके पूछें
- Page refresh करके देखें`,
            error: true,
            errorType: error.name || 'UNKNOWN_ERROR',
            details: error.message,
            timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// === उपयोगिता फंक्शन्स (Export for testing) ===
export {
    extractTextFromBuffer,
    getEmbedding,
    searchRelevantContext,
    saveToQdrant
};
