import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const callOpenAI = async (messages) => {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
    });
    return response.choices[0].message.content;
};

// OpenRouter
const openRouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});
export const callOpenRouter = async (messages) => {
    const response = await openRouter.chat.completions.create({
        model: "mistralai/mistral-7b-instruct:free",
        messages,
    });
    return response.choices[0].message.content;
};

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const callGemini = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    return result.response.text();
};