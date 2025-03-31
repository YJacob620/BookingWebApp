import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

import { generateToken } from '../utils'

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

    // Encode the original filename in a way that preserves UTF-8 characters
    const safeName: string = `${timestamp}-${randomString}${fileExtension}`;
    return safeName;
};

// Configure storage
const storage: StorageEngine = multer.diskStorage({
    destination: function (req: Request, file: FileUploadFile, cb: (error: Error | null, destination: string) => void) {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8'); // CRUCIAL FOR NON-ENGLISH FILE NAMES
        cb(null, uploadDir);
    },
    filename: function (req: Request, file: FileUploadFile, cb: (error: Error | null, filename: string) => void) {
        // Generate a secure filename that will be later associated with the booking
        const secureFilename: string = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
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
    '.rtf': 'application/rtf',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.csv': 'text/csv',
    '.xml': 'text/xml',
    '.json': 'application/json',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.zip': 'application/zip',
    '.x-zip-compressed': 'application/x-zip-compressed'
};

// Create the upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB file size limit
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const allowedTypes = Object.values(mimeTypes); // Get allowed MIME types from dictionary

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Word, Excel, images, text files, and common file types are allowed.'));
        }
    }
});

// Get mimetype based on filename 
const getMimeType = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
};

export {
    upload,
    getFileUrl,
    getFilePath,
    getMimeType,
    uploadDir
};