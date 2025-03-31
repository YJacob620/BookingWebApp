import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { Request } from 'express';
import { fileURLToPath } from 'url';

import { generateToken } from '../utils'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define interfaces for file handling
interface FileUploadFile extends Express.Multer.File {
    originalFilename?: string;
}

// Create uploads directory if it doesn't exist
const uploadDir: string = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Generate a secure filename hash based on original filename
const generateSecureFilename = (originalname: string): string => {
    const timestamp: number = Date.now();
    const randomString = generateToken(8);
    const fileExtension: string = path.extname(originalname);
    // Encode the original filename in the database only, not in the filesystem
    const safeName: string = `${timestamp}-${randomString}${fileExtension}`;
    return safeName;
};

// Configure storage
const storage: StorageEngine = multer.diskStorage({
    destination: function (req: Request, file: FileUploadFile, cb: (error: Error | null, destination: string) => void) {
        cb(null, uploadDir);
    },
    filename: function (req: Request, file: FileUploadFile, cb: (error: Error | null, filename: string) => void) {
        // Generate a secure filename that will be later associated with the booking
        const secureFilename: string = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
    }
});

// Create the upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB file size limit
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // Accept common document types
        const allowedTypes: string[] = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'text/plain',
            'application/zip',
            'application/x-zip-compressed'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and common file types are allowed.'));
        }
    }
});

// Helper method to get file URL from saved path
const getFileUrl = (filePath: string | null): string | null => {
    if (!filePath) return null;
    // Convert file system path to URL path
    const relativePath: string = path.relative(uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
};

// Helper to get the full file path from a filename
const getFilePath = (filename: string): string => {
    return path.join(uploadDir, filename);
};

// Get mimetype based on filename
const getMimeType = (filename: string): string => {
    const ext: string = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.zip': 'application/zip'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};

export {
    upload,
    getFileUrl,
    getFilePath,
    getMimeType,
    uploadDir
};