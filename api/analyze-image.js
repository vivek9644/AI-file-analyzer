// api/analyze-image.js - इमेज OCR विश्लेषण
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import multer from 'multer';

const upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('केवल इमेज फाइलें समर्थित हैं'), false);
        }
    }
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    upload.single('file')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            // इमेज को ऑप्टिमाइज़ करें
            const optimizedBuffer = await sharp(req.file.buffer)
                .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                .greyscale()
                .normalize()
                .toBuffer();

            // OCR चलाएं
            const { data: { text, confidence } } = await Tesseract.recognize(
                optimizedBuffer,
                'hin+eng'
            );

            res.json({
                success: true,
                text: text.trim(),
                confidence: confidence,
                originalSize: req.file.size,
                processedSize: optimizedBuffer.length
            });

        } catch (error) {
            res.status(500).json({
                error: 'इमेज प्रोसेसिंग में त्रुटि',
                details: error.message
            });
        }
    });
}

export const config = {
    api: {
        bodyParser: false,
    },
};
