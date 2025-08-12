// /api/analyze.js

import { OpenAI } from 'openai'; // OpenRouter uses OpenAI's SDK structure
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// 1. OpenRouter क्लाइंट को इनिशियलाइज़ करें
const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
    const filePath = file.filepath;
    const fileType = file.mimetype;

    if (fileType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } else if (fileType.startsWith('image/')) {
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng', { logger: m => console.log(m) });
        return text;
    } else if (fileType.startsWith('text/')) {
        return fs.readFileSync(filePath, 'utf-8');
    } else {
        return "Unsupported file type for text extraction.";
    }
}


export const config = {
  api: {
    bodyParser: false, // formidable handles the body parsing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const prompt = fields.prompt[0];
    const uploadedFile = files.file ? files.file[0] : null;

    if (!uploadedFile) {
        return res.status(400).json({ message: 'File is required for analysis.' });
    }

    // 2. फाइल से टेक्स्ट निकालें
    const fileContent = await extractTextFromFile(uploadedFile);

    // 3. OpenRouter को अनुरोध भेजें
    const finalPrompt = `Analyze the following document content based on the user's request.\n\nUser Request: "${prompt}"\n\nDocument Content:\n"""\n${fileContent}\n"""`;

    const chatCompletion = await openRouter.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free", // Use a free or preferred model from OpenRouter
      messages: [{ role: 'user', content: finalPrompt }],
    });
    const aiResponse = chatCompletion.choices[0].message.content;

    // Optional: आप फाइल के कंटेंट को भी Qdrant में सेव कर सकते हैं ताकि भविष्य में याद रहे।
    // This part is omitted for simplicity but can be added using the logic from /api/chat.js

    res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Error in analyze API:", error);
    res.status(500).json({ message: 'Error processing your file', details: error.message });
  }
}