// src/utils/file-extractor.js

import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import ExcelJS from 'exceljs';

/**
 * अपलोड की गई फ़ाइल से टेक्स्ट निकालता है।
 * विभिन्न फ़ाइल प्रकारों (PDF, DOCX, TXT, JS, PY, JSON, MD, Image, XLSX) का समर्थन करता है।
 * @param {object} file - formidable से प्राप्त फ़ाइल ऑब्जेक्ट।
 * @returns {Promise<string>} - निकाली गई टेक्स्ट।
 */
export async function extractTextFromFile(file) {
  const filePath = file.filepath;
  const fileType = file.mimetype;
  const fileName = file.originalFilename;

  console.log(`Extracting text from: ${fileName} (${fileType})`);

  try {
    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } 
    
    else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } 
    
    else if (fileType.startsWith('image/')) {
      console.log('Starting OCR process for image...');
      // Vercel पर पाथ के साथ समस्या हो सकती है, इसलिए buffer का उपयोग करना बेहतर है
      const imageBuffer = fs.readFileSync(filePath);
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(`Tesseract progress: ${m.status} - ${Math.round(m.progress * 100)}%`),
      });
      console.log('OCR process finished.');
      return text;
    } 
    
    else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      let fullText = '';
      
      workbook.eachSheet((worksheet, sheetId) => {
        fullText += `--- Sheet: ${worksheet.name} ---\n`;
        worksheet.eachRow((row, rowNumber) => {
          const rowValues = [];
          row.eachCell((cell, colNumber) => {
            rowValues.push(cell.value || '');
          });
          fullText += rowValues.join(',') + '\n';
        });
        fullText += '\n';
      });
      
      return fullText;
    }

    else if (
      fileType.startsWith('text/') || 
      ['application/json', 'application/javascript', 'text/markdown'].includes(fileType)
    ) {
      return fs.readFileSync(filePath, 'utf-8');
    } 
    
    else {
      console.warn(`Unsupported file type: ${fileType}. Returning file name as content.`);
      return `File content for "${fileName}" could not be extracted. The file type "${fileType}" is not supported for text extraction.`;
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    throw new Error(`Failed to process file: ${fileName}`);
  } finally {
    // प्रोसेस करने के बाद अस्थायी फ़ाइल को हटा दें
    fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
    });
  }
}