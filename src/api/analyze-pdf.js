
const formidable = require('formidable');
const pdf = require('pdf-parse');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Replit में फाइल अपलोड को सही से हैंडल करने के लिए कॉन्फ़िग
export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'सिर्फ POST रिक्वेस्ट्स स्वीकार्य हैं' });
  }

  // Replit Secrets से API key लें
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY Replit Secrets में नहीं मिली। कृपया add करें।' 
    });
  }

  const form = formidable({});
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'फाइल पार्स करने में एरर' });
    }
    
    try {
      const pdfPath = files.file.filepath;
      const dataBuffer = fs.readFileSync(pdfPath);
      
      // PDF से टेक्स्ट निकालें
      const pdfData = await pdf(dataBuffer);
      const extractedText = pdfData.text;
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ 
          error: 'PDF में कोई टेक्स्ट नहीं मिला या PDF protected है' 
        });
      }

      // Gemini AI का उपयोग करके टेक्स्ट को analyze करें
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const analysisPrompt = `
निम्नलिखित PDF content का detailed analysis करें:

${extractedText}

कृपया निम्न जानकारी प्रदान करें:
1. 📄 **मुख्य विषय**: इस document का मुख्य विषय क्या है?
2. 🎯 **Key Points**: सबसे महत्वपूर्ण points क्या हैं?
3. 📊 **Summary**: 2-3 वाक्यों में संक्षेप दें
4. 🔍 **Category**: यह किस प्रकार का document है (Report, Article, etc.)
5. 📈 **Insights**: कोई विशेष insights या patterns

कृपया हिंदी में detailed response दें।
      `;
      
      const result = await model.generateContent(analysisPrompt);
      const analysis = await result.response.text();
      
      res.status(200).json({
        success: true,
        extractedText: extractedText,
        analysis: analysis,
        pageCount: pdfData.numpages,
        fileName: files.file.originalFilename,
        fileSize: files.file.size
      });
      
    } catch (pdfError) {
      console.error('PDF Analysis Error:', pdfError);
      res.status(500).json({ 
        error: 'PDF analysis में एरर',
        details: pdfError.message 
      });
    }
  });
};
