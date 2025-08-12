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
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        if (!data.text || data.text.trim().length === 0) {
          console.warn(`PDF file ${fileName} appears to be empty or contains no extractable text`);
          return `PDF file "${fileName}" processed successfully but no text content was found. The file might contain only images or be password protected.`;
        }
        return data.text;
      } catch (pdfError) {
        console.error(`PDF processing error for ${fileName}:`, pdfError);
        throw new Error(`PDF file "${fileName}" could not be processed. The file might be corrupted, password protected, or in an unsupported PDF format.`);
      }
    } 
    
    else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (!result.value || result.value.trim().length === 0) {
          console.warn(`DOCX file ${fileName} appears to be empty`);
          return `DOCX file "${fileName}" processed successfully but no text content was found.`;
        }
        return result.value;
      } catch (docxError) {
        console.error(`DOCX processing error for ${fileName}:`, docxError);
        throw new Error(`DOCX file "${fileName}" could not be processed. The file might be corrupted or in an unsupported Word format.`);
      }
    } 
    
    else if (fileType.startsWith('image/')) {
      try {
        console.log('Starting OCR process for image...');
        const imageBuffer = fs.readFileSync(filePath);
        
        // Image size validation
        if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('Image file is too large. Please use an image smaller than 10MB.');
        }

        const { data: { text, confidence } } = await Tesseract.recognize(imageBuffer, 'eng+hin', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        
        console.log(`OCR completed with ${confidence}% confidence`);
        
        if (!text || text.trim().length === 0) {
          return `Image "${fileName}" processed successfully but no text was detected. The image might not contain readable text or the text might be too unclear for OCR.`;
        }
        
        if (confidence < 30) {
          console.warn(`Low OCR confidence (${confidence}%) for ${fileName}`);
          return `Text extracted from "${fileName}" with low confidence (${confidence}%). Results might be inaccurate:\n\n${text}`;
        }
        
        return text;
      } catch (ocrError) {
        console.error(`OCR processing error for ${fileName}:`, ocrError);
        throw new Error(`Image OCR failed for "${fileName}". ${ocrError.message || 'The image might be corrupted or in an unsupported format.'}`);
      }
    } 
    
    else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        let fullText = '';
        let totalRows = 0;
        
        workbook.eachSheet((worksheet, sheetId) => {
          fullText += `--- Sheet: ${worksheet.name} ---\n`;
          let sheetRows = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            const rowValues = [];
            row.eachCell((cell, colNumber) => {
              const cellValue = cell.value;
              // Handle different cell value types
              if (cellValue !== null && cellValue !== undefined) {
                if (typeof cellValue === 'object' && cellValue.richText) {
                  // Handle rich text
                  rowValues.push(cellValue.richText.map(rt => rt.text).join(''));
                } else if (typeof cellValue === 'object' && cellValue.formula) {
                  // Handle formulas
                  rowValues.push(cellValue.result || cellValue.formula);
                } else {
                  rowValues.push(cellValue.toString());
                }
              } else {
                rowValues.push('');
              }
            });
            if (rowValues.some(val => val.trim() !== '')) {
              fullText += rowValues.join(',') + '\n';
              sheetRows++;
              totalRows++;
            }
          });
          
          if (sheetRows === 0) {
            fullText += 'No data found in this sheet.\n';
          }
          fullText += '\n';
        });
        
        if (totalRows === 0) {
          return `Excel file "${fileName}" processed successfully but no data was found in any sheets.`;
        }
        
        console.log(`Excel file processed: ${totalRows} rows extracted from ${workbook.worksheets.length} sheets`);
        return fullText;
      } catch (excelError) {
        console.error(`Excel processing error for ${fileName}:`, excelError);
        throw new Error(`Excel file "${fileName}" could not be processed. The file might be corrupted, password protected, or in an unsupported Excel format.`);
      }
    }

    else if (
      fileType.startsWith('text/') || 
      ['application/json', 'application/javascript', 'text/markdown'].includes(fileType)
    ) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content || content.trim().length === 0) {
          return `Text file "${fileName}" is empty.`;
        }
        return content;
      } catch (textError) {
        console.error(`Text file processing error for ${fileName}:`, textError);
        throw new Error(`Text file "${fileName}" could not be read. The file might be corrupted or encoded in an unsupported format.`);
      }
    } 
    
    else {
      console.warn(`Unsupported file type: ${fileType} for file: ${fileName}`);
      return `File content for "${fileName}" could not be extracted. The file type "${fileType}" is not supported for text extraction. Supported formats include: PDF, DOCX, Excel (XLSX/XLS), Images (JPG, PNG, etc.), and Text files.`;
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName} (Type: ${fileType}):`, error);
    // Check if it's already our custom error message
    if (error.message.includes('could not be processed') || error.message.includes('failed for')) {
      throw error; // Re-throw our custom error messages
    }
    // Generic fallback error
    throw new Error(`Failed to process the file "${fileName}". The file might be corrupted or in an unsupported format. Please try with a different file or contact support if the issue persists.`);
  } finally {
    // सुनिश्चित करें कि अस्थायी फाइल हमेशा डिलीट हो, भले ही कोई एरर आए
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Temporary file cleaned up: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error(`Failed to delete temporary file: ${filePath}`, cleanupError);
      // Don't throw here as cleanup failure shouldn't break the main process
    }
  }
}