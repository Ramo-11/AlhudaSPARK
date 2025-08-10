// Vendor Model for MongoDB
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    // Unique vendor ID
    vendorId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Business Information
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    contactPerson: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    website: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Vendor Category
    vendorType: {
        type: String,
        required: true,
        enum: ['food', 'clothing', 'accessories', 'books', 'toys', 'sports', 'services', 'other'],
        lowercase: true
    },
    
    // Business Description
    businessDescription: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    
    // Booth Location & Pricing
    boothLocation: {
        type: String,
        required: true,
        enum: ['back', 'central', 'side_corner', 'front_corner'],
        lowercase: true
    },
    boothPrice: {
        type: Number,
        required: true
    },
    
    // Payment Information
    paymentMethod: {
        type: String,
        required: true,
        enum: ['check', 'cash', 'zelle', 'venmo', 'stripe', 'zeffy']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        default: null
    },
    paymentDate: {
        type: Date,
        default: null
    },
    
    // Zeffy specific fields
    zeffySessionId: {
        type: String,
        default: null
    },
    
    // Booth Requirements
    requiresElectricity: {
        type: Boolean,
        default: false
    },
    requiresWater: {
        type: Boolean,
        default: false
    },
    specialRequirements: {
        type: String,
        default: '',
        maxlength: 200
    },
    
    // Additional Information
    comments: {
        type: String,
        default: ''
    },
    
    // Admin fields
    notes: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    boothNumber: {
        type: String,
        default: null
    },
    
    // Setup tracking
    setupInstructions: {
        type: String,
        default: ''
    },
    setupComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
vendorSchema.index({ vendorType: 1, paymentStatus: 1 });
vendorSchema.index({ boothLocation: 1, paymentStatus: 1 });
vendorSchema.index({ createdAt: -1 });

// Static method to generate unique vendor ID
vendorSchema.statics.generateVendorId = function() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `VND-${timestamp}-${randomStr}`.toUpperCase();
};

// Static method to get booth pricing
vendorSchema.statics.getBoothPricing = function() {
    return {
        'back': 750,           // Far back locations with low traffic
        'central': 1100,       // Central aisle locations
        'side_corner': 1400,   // Side corner aisle booth
        'front_corner': 1600   // Front corner aisle booths
    };
};

// Instance method to mark payment as complete
vendorSchema.methods.markPaymentComplete = function(transactionId) {
    this.paymentStatus = 'completed';
    this.transactionId = transactionId;
    this.paymentDate = new Date();
    return this.save();
};

// Instance method to update payment status
vendorSchema.methods.updatePaymentStatus = function(status, transactionId = null) {
    this.paymentStatus = status;
    if (transactionId) {
        this.transactionId = transactionId;
    }
    if (status === 'completed') {
        this.paymentDate = new Date();
    }
    return this.save();
};

// Instance method to assign booth number
vendorSchema.methods.assignBoothNumber = function(boothNumber) {
    this.boothNumber = boothNumber;
    return this.save();
};

// Static method to find vendors by type
vendorSchema.statics.findByType = function(vendorType) {
    return this.find({ 
        vendorType: vendorType.toLowerCase(), 
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find vendors by location
vendorSchema.statics.findByLocation = function(boothLocation) {
    return this.find({ 
        boothLocation: boothLocation.toLowerCase(), 
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find active vendors
vendorSchema.statics.findActiveVendors = function() {
    return this.find({ 
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ boothLocation: 1, createdAt: -1 });
};

// Static method to find pending payments
vendorSchema.statics.findPendingPayments = function() {
    return this.find({ 
        paymentStatus: 'pending'
    }).sort({ createdAt: -1 });
};

// Virtual for display name
vendorSchema.virtual('displayName').get(function() {
    return this.businessName;
});

// Virtual for vendor type display name
vendorSchema.virtual('vendorTypeDisplayName').get(function() {
    const typeMap = {
        'food': 'Food & Beverages',
        'clothing': 'Clothing & Apparel',
        'accessories': 'Accessories',
        'books': 'Books & Education',
        'toys': 'Toys & Games',
        'sports': 'Sports & Fitness',
        'services': 'Services',
        'other': 'Other'
    };
    return typeMap[this.vendorType] || this.vendorType;
});

// Virtual for booth location display name
vendorSchema.virtual('boothLocationDisplayName').get(function() {
    const locationMap = {
        'back': 'Back Area (Low Traffic)',
        'central': 'Central Aisle',
        'side_corner': 'Side Corner Aisle',
        'front_corner': 'Front Corner Aisle'
    };
    return locationMap[this.boothLocation] || this.boothLocation;
});

// Transform for JSON output
vendorSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;