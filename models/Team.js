// Team Model for MongoDB
const mongoose = require('mongoose');

// Player sub-schema
const playerSchema = new mongoose.Schema({
    playerName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    idPhotoUrl: {
        type: String,
        required: function() {
            return this.parent()?.tier === 'high_school';
        },
        trim: true
    },
    idPhotoPublicId: {
        type: String,
        default: null
    },
    idPhotoOriginalName: {
        type: String,
        required: function() {
            return this.parent()?.tier === 'high_school';
        },
        trim: true
    },
    // Calculated age at registration
    ageAtRegistration: {
        type: Number,
        required: true
    }
}, {
    _id: true // Allow _id for each player
});

const teamSchema = new mongoose.Schema({
    // Unique team ID
    teamId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Team Information
    teamName: {
        type: String,
        required: true,
        trim: true
    },
    organization: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    
    // Competition Details
    tier: {
        type: String,
        required: true,
        enum: ['elementary', 'middle', 'high_school'],
        lowercase: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female'],
        lowercase: true
    },
    
    // Coach/Contact Information
    coachName: {
        type: String,
        required: true,
        trim: true
    },
    coachEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    coachPhone: {
        type: String,
        required: true,
        trim: true
    },
    
    // Players (minimum 5, maximum 10)
    players: {
        type: [playerSchema],
        required: true,
        validate: [
            {
                validator: function(players) {
                    return players.length >= 1;
                },
                message: 'Team must have at least 5 players'
            },
            {
                validator: function(players) {
                    return players.length <= 10;
                },
                message: 'Team cannot have more than 10 players'
            }
        ]
    },
    
    // Registration Status
    registrationStatus: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected', 'waitlisted'],
        default: 'pending'
    },
    
    // Payment Information
    registrationFee: {
        type: Number,
        required: true,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['check', 'cash', 'zelle', 'venmo', 'stripe', 'zeffy'],
        default: null
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
    
    // Tournament Details
    groupAssignment: {
        type: String,
        default: null
    },
    seedNumber: {
        type: Number,
        default: null
    },
    
    // Additional Information
    emergencyContact: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        relationship: {
            type: String,
            required: true,
            trim: true
        }
    },
    
    specialRequirements: {
        type: String,
        default: '',
        maxlength: 300
    },
    
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
    
    // Document verification
    documentsVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: String,
        default: null
    },
    verifiedDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
teamSchema.index({ tier: 1, gender: 1, registrationStatus: 1 });
teamSchema.index({ organization: 1 });
teamSchema.index({ city: 1 });
teamSchema.index({ createdAt: -1 });
teamSchema.index({ coachEmail: 1 });

// Static method to generate unique team ID
teamSchema.statics.generateTeamId = function() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `TM-${timestamp}-${randomStr}`.toUpperCase();
};

// Static method to get registration fees by tier
teamSchema.statics.getRegistrationFees = function() {
    return {
        'elementary': 350,
        'middle': 350,
        'high_school': 350
    };
};

// Instance method to calculate player ages
teamSchema.methods.calculatePlayerAges = function() {
    const currentDate = new Date();
    this.players.forEach(player => {
        const birthDate = new Date(player.dateOfBirth);
        const age = Math.floor((currentDate - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        player.ageAtRegistration = age;
    });
};

// Instance method to validate player ages for tier
teamSchema.methods.validatePlayerAgesForTier = function() {
    const ageRanges = {
        'elementary': { min: 4, max: 11 },
        'middle': { min: 10, max: 15 },
        'high_school': { min: 13, max: 20 }
    };
    
    const range = ageRanges[this.tier];
    if (!range) return false;
    
    return this.players.every(player => 
        player.ageAtRegistration >= range.min && player.ageAtRegistration <= range.max
    );
};

// Instance method to mark payment as complete
teamSchema.methods.markPaymentComplete = function(transactionId) {
    this.paymentStatus = 'completed';
    this.transactionId = transactionId;
    this.paymentDate = new Date();
    return this.save();
};

// Instance method to approve team
teamSchema.methods.approveTeam = function(verifiedBy = null) {
    this.registrationStatus = 'approved';
    this.documentsVerified = true;
    this.verifiedBy = verifiedBy;
    this.verifiedDate = new Date();
    return this.save();
};

// Instance method to assign to group
teamSchema.methods.assignToGroup = function(groupName, seedNumber = null) {
    this.groupAssignment = groupName;
    this.seedNumber = seedNumber;
    return this.save();
};

// Static method to find teams by tier and gender
teamSchema.statics.findByTierAndGender = function(tier, gender) {
    return this.find({ 
        tier: tier.toLowerCase(),
        gender: gender.toLowerCase(),
        registrationStatus: 'approved',
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find teams by organization
teamSchema.statics.findByOrganization = function(organization) {
    return this.find({ 
        organization: new RegExp(organization, 'i'),
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find approved teams
teamSchema.statics.findApprovedTeams = function() {
    return this.find({ 
        registrationStatus: 'approved',
        paymentStatus: 'completed',
        isActive: true 
    }).sort({ tier: 1, gender: 1, createdAt: -1 });
};

// Static method to find pending registrations
teamSchema.statics.findPendingRegistrations = function() {
    return this.find({ 
        registrationStatus: 'pending'
    }).sort({ createdAt: -1 });
};

// Virtual for tier display name
teamSchema.virtual('tierDisplayName').get(function() {
    const tierMap = {
        'elementary': 'Elementary School',
        'middle': 'Middle School',
        'high_school': 'High School'
    };
    return tierMap[this.tier] || this.tier;
});

// Virtual for gender display name
teamSchema.virtual('genderDisplayName').get(function() {
    return this.gender.charAt(0).toUpperCase() + this.gender.slice(1);
});

// Virtual for player count
teamSchema.virtual('playerCount').get(function() {
    return this.players.length;
});

// Virtual for team status display
teamSchema.virtual('statusDisplay').get(function() {
    if (this.registrationStatus === 'approved' && this.paymentStatus === 'completed') {
        return 'Ready to Play';
    }
    if (this.registrationStatus === 'approved' && this.paymentStatus === 'pending') {
        return 'Payment Pending';
    }
    return this.registrationStatus.charAt(0).toUpperCase() + this.registrationStatus.slice(1);
});

// Pre-save middleware to calculate ages
teamSchema.pre('save', function(next) {
    if (this.isModified('players')) {
        this.calculatePlayerAges();
    }
    next();
});

// Transform for JSON output
teamSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;