// Sponsor Model for MongoDB
const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
    // Unique sponsor ID
    sponsorId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Company Information
    companyName: {
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
    logo: {
        type: String,
        trim: true,
    },

    // Sponsorship Details
    tier: {
        type: String,
        required: true,
        enum: ['diamond', 'platinum', 'gold', 'silver'],
        lowercase: true
    },
    amount: {
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
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
sponsorSchema.index({ tier: 1, paymentStatus: 1 });
sponsorSchema.index({ createdAt: -1 });

// Static method to generate unique sponsor ID
sponsorSchema.statics.generateSponsorId = function() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `SPR-${timestamp}-${randomStr}`.toUpperCase();
};

// Instance method to mark payment as complete
sponsorSchema.methods.markPaymentComplete = function(transactionId) {
    this.paymentStatus = 'completed';
    this.transactionId = transactionId;
    this.paymentDate = new Date();
    return this.save();
};

// Instance method to update payment status
sponsorSchema.methods.updatePaymentStatus = function(status, transactionId = null) {
    this.paymentStatus = status;
    if (transactionId) {
        this.transactionId = transactionId;
    }
    if (status === 'completed') {
        this.paymentDate = new Date();
    }
    return this.save();
};

// Static method to find sponsors by tier
sponsorSchema.statics.findByTier = function(tier) {
    return this.find({ 
        tier: tier.toLowerCase(), 
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find active sponsors
sponsorSchema.statics.findActiveSponsors = function() {
    return this.find({ 
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ tier: 1, createdAt: -1 });
};

// Static method to find pending payments
sponsorSchema.statics.findPendingPayments = function() {
    return this.find({ 
        paymentStatus: 'pending'
    }).sort({ createdAt: -1 });
};

// Virtual for display name
sponsorSchema.virtual('displayName').get(function() {
    return this.companyName;
});

// Virtual for tier display name
sponsorSchema.virtual('tierDisplayName').get(function() {
    return this.tier.charAt(0).toUpperCase() + this.tier.slice(1);
});

// Transform for JSON output
sponsorSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Sponsor = mongoose.model('Sponsor', sponsorSchema);

module.exports = Sponsor;