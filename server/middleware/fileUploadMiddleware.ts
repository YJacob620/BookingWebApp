import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

import { generateToken } from '../utils'

// Define interfaces for file handling
interface FileUploadFile extends Express.Multer.File {
    originalFilename?: string;
}

let MAX_UPLOAD_SIZE_MB = 50;

/**
 * Directory for file uploads
 */
const uploadDir: string = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Directory for temporary files that need confirmation
 */
const tempUploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Generate a secure filename hash based on original filename
const generateSecureFilename = (originalname: string): string => {
    const timestamp: number = Date.now();
    const randomString = generateToken(8);
    const fileExtension: string = path.extname(originalname);

    // Create a secure filename with timestamp and random string
    const safeName: string = `${timestamp}-${randomString}${fileExtension}`;
    return safeName;
};

// Add fileMetadata property to Request interface
declare global {
    namespace Express {
        interface Request {
            fileMetadata?: Record<string, {
                originalName: string;
                secureFilename: string;
            }>;
        }
    }
}

// Configure storage with transaction-like behavior
const storage: StorageEngine = multer.diskStorage({
    destination: function (req: Request, file: FileUploadFile, cb: (error: Error | null, destination: string) => void) {
        // Standardize handling between regular users and guests
        const isGuestBooking = req.path.includes('/guest/request');

        // Use temporary directory for guest uploads awaiting confirmation
        // Use standard upload directory for confirmed bookings
        const uploadPath = isGuestBooking ? tempUploadDir : uploadDir;

        // Handle UTF-8 filename encoding
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

        // Ensure the directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req: Request, file: FileUploadFile, cb: (error: Error | null, filename: string) => void) {
        // Generate a secure filename for all uploads
        const secureFilename: string = generateSecureFilename(file.originalname);

        // Store the original filename and the secure filename for later reference
        if (!req.fileMetadata) {
            req.fileMetadata = {};
        }

        req.fileMetadata[file.fieldname] = {
            originalName: file.originalname,
            secureFilename: secureFilename
        };

        cb(null, secureFilename);
    }
});

/**
 * Middleware for file-uploads. Creates 
 */
const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024, },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const allowedTypes = Object.values(mimeTypes); // Get allowed MIME types from dictionary
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Word, Excel, images, text files, and common file types are allowed.'));
        }
    }
});

/**
 * Moves a file from temporary directory to permanent storage with booking ID
 * Returns the new file path or null if operation failed
 */
const moveFileToStorage = (tempFilePath: string, bookingId: number, secureFilename: string): string | null => {
    try {
        // Create booking-specific directory
        const bookingDir = path.join(uploadDir, `booking_${bookingId}`);
        if (!fs.existsSync(bookingDir)) {
            fs.mkdirSync(bookingDir, { recursive: true });
        }

        // Move the file
        const finalPath = path.join(bookingDir, secureFilename);
        fs.renameSync(tempFilePath, finalPath);

        return finalPath;
    } catch (error) {
        console.error(`Error moving file from ${tempFilePath}:`, error);
        return null;
    }
};

/**
 * Cleans up temporary files if an operation fails
 */
const cleanupTempFiles = (files: Array<string>): void => {
    for (const filePath of files) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`Error removing temporary file ${filePath}:`, error);
        }
    }
};

// Helper method to get file URL from saved path
const getFileUrl = (filePath: string | null): string | null => {
    if (!filePath) return null;
    // Convert file system path to URL path
    const relativePath: string = path.relative(uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
};

// Helper to get the full file path from a filename
const getFilePath = (bookingId: number, filename: string): string => {
    return path.join(uploadDir, `booking_${bookingId}`, filename);
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
    uploadDir,
    tempUploadDir,
    moveFileToStorage,
    cleanupTempFiles
};