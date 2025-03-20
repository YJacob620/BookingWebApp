const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Generate a secure filename hash based on original filename
const generateSecureFilename = (originalname) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = path.extname(originalname);
    const safeName = `${timestamp}-${randomString}${fileExtension}`;
    return safeName;
};

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a secure filename that will be later associated with the booking
        const secureFilename = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
    }
});

// Create the upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB file size limit
    },
    fileFilter: (req, file, cb) => {
        // Accept common document types
        const allowedTypes = [
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
const getFileUrl = (filePath) => {
    if (!filePath) return null;
    // Convert file system path to URL path
    const relativePath = path.relative(uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
};

// Helper to get the full file path from a filename
const getFilePath = (filename) => {
    return path.join(uploadDir, filename);
};

// Get mimetype based on filename
const getMimeType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
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

module.exports = {
    upload,
    getFileUrl,
    getFilePath,
    getMimeType,
    uploadDir
};