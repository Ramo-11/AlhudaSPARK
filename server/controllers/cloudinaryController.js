const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Upload single image to Cloudinary
const uploadImageToCloudinary = async (fileBuffer, options = {}) => {
    const defaultOptions = {
        folder: 'alhuda_spark',
        transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
        ],
        ...options
    };

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            defaultOptions,
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        ).end(fileBuffer);
    });
};

// Delete image from Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

// Single image upload controller
const handleImageUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided' 
            });
        }

        const result = await uploadImageToCloudinary(req.file.buffer);

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload image',
            message: error.message 
        });
    }
};

// Multiple images upload controller
const handleMultipleImageUpload = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No image files provided' 
            });
        }

        const uploadPromises = req.files.map(file => uploadImageToCloudinary(file.buffer));
        const uploadResults = await Promise.all(uploadPromises);

        const images = uploadResults.map(result => ({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        }));

        res.json({
            success: true,
            images: images,
            count: images.length
        });

    } catch (error) {
        console.error('Multiple image upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload images',
            message: error.message 
        });
    }
};

// Image deletion controller
const handleImageDeletion = async (req, res) => {
    try {
        const { publicId } = req.params;
        
        if (!publicId) {
            return res.status(400).json({ 
                success: false,
                error: 'Public ID is required' 
            });
        }

        const result = await deleteImageFromCloudinary(publicId);

        res.json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('Image deletion error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete image',
            message: error.message 
        });
    }
};

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large',
                message: 'File size must be less than 10MB' 
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false,
                error: 'Too many files',
                message: 'Maximum 10 files allowed' 
            });
        }
    }
    
    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid file type',
            message: 'Only image files are allowed' 
        });
    }

    res.status(500).json({ 
        success: false,
        error: 'Upload error',
        message: error.message 
    });
};

module.exports = {
    upload,
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    handleImageUpload,
    handleMultipleImageUpload,
    handleImageDeletion,
    handleMulterError
};