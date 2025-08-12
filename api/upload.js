// api/upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { formidable } from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false, // बॉडी पार्सर को डिसेबल करें क्योंकि formidable इसे हैंडल करेगा
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        
        const file = files.file[0];
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const fileStream = fs.createReadStream(file.filepath);
        const fileName = `${Date.now()}-${file.originalFilename}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: fileStream,
            ContentType: file.mimetype,
        }));
        
        const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

        res.status(200).json({ success: true, fileUrl, fileName: file.originalFilename, fileType: file.mimetype });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ success: false, error: "File upload failed." });
    }
}