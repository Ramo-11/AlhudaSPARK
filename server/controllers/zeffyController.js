// Zeffy Controller for handling sponsorship payments
const axios = require('axios');
const crypto = require('crypto');
const Sponsor = require('../../models/Sponsor');

// Zeffy API configuration
const ZEFFY_API_URL = process.env.ZEFFY_API_URL || 'https://api.zeffy.com/v1';
const ZEFFY_API_KEY = process.env.ZEFFY_API_KEY;
const ZEFFY_FORM_ID = process.env.ZEFFY_FORM_ID;

/**
 * Create a Zeffy payment session for sponsorship
 */
const createZeffyPaymentSession = async (req, res) => {
    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            address,
            website,
            tier,
            amount,
            comments
        } = req.body;

        // Validate required fields
        if (!companyName || !contactPerson || !email || !phone || !tier || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate tier and amount
        const tierAmounts = {
            'diamond': 10000,
            'platinum': 5000,
            'gold': 2500,
            'silver': 1000
        };

        if (!tierAmounts[tier] || parseFloat(amount) !== tierAmounts[tier]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tier or amount'
            });
        }

        // Generate sponsor ID
        const sponsorId = Sponsor.generateSponsorId();

        // Create sponsor record in database with pending status
        const sponsor = new Sponsor({
            sponsorId,
            companyName,
            contactPerson,
            email,
            phone,
            address: address || '',
            website: website || '',
            tier,
            amount: parseFloat(amount),
            paymentMethod: 'zeffy',
            paymentStatus: 'processing',
            comments: comments || ''
        });

        // Save to database
        await sponsor.save();

        // Create Zeffy payment session
        const zeffyData = {
            formId: ZEFFY_FORM_ID,
            amount: parseFloat(amount),
            currency: 'USD',
            metadata: {
                type: 'sponsorship',
                tier: tier,
                sponsorId: sponsorId,
                companyName: companyName,
                contactPerson: contactPerson,
                email: email
            },
            donor: {
                email: email,
                firstName: contactPerson.split(' ')[0] || contactPerson,
                lastName: contactPerson.split(' ').slice(1).join(' ') || '',
                phone: phone,
                organization: companyName
            },
            redirectUrl: `${process.env.BASE_URL}/sponsorship/success?sponsorId=${sponsorId}`,
            cancelUrl: `${process.env.BASE_URL}/sponsorship`
        };

        // Make API call to Zeffy
        const response = await axios.post(
            `${ZEFFY_API_URL}/payment-sessions`,
            zeffyData,
            {
                headers: {
                    'Authorization': `Bearer ${ZEFFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update sponsor with Zeffy session ID
        sponsor.zeffySessionId = response.data.sessionId;
        await sponsor.save();

        // Return payment URL
        res.json({
            success: true,
            paymentUrl: response.data.paymentUrl,
            sessionId: response.data.sessionId,
            sponsorId: sponsorId
        });

    } catch (error) {
        console.error('Zeffy payment session error:', error);
        
        // If it's an axios error, log more details
        if (error.response) {
            console.error('Zeffy API response error:', error.response.data);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create payment session. Please try again or contact support.'
        });
    }
};

/**
 * Handle Zeffy webhook for payment confirmation
 */
const handleZeffyWebhook = async (req, res) => {
    try {
        const signature = req.headers['zeffy-signature'];
        const webhookSecret = process.env.ZEFFY_WEBHOOK_SECRET;

        // Verify webhook signature
        if (!verifyZeffySignature(req.body, signature, webhookSecret)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { event, data } = req.body;

        switch (event) {
            case 'payment.completed':
                await handlePaymentCompleted(data);
                break;
            case 'payment.failed':
                await handlePaymentFailed(data);
                break;
            case 'payment.cancelled':
                await handlePaymentCancelled(data);
                break;
            default:
                console.log(`Unhandled Zeffy event: ${event}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Zeffy webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Save sponsor registration (for non-Zeffy payments)
 */
const saveSponsorRegistration = async (req, res) => {
    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            address,
            website,
            tier,
            amount,
            paymentMethod,
            comments
        } = req.body;

        // Validate required fields
        if (!companyName || !contactPerson || !email || !phone || !tier || !amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Check if sponsor already exists with same email and tier and company name
        const existingSponsor = await Sponsor.findOne({
            email: email.toLowerCase(),
            tier: tier,
            companyName: companyName,
            paymentStatus: { $in: ['pending', 'processing', 'completed'] }
        });

        if (existingSponsor) {
            return res.status(400).json({
                success: false,
                error: 'A sponsorship registration already exists for this email, tier, and company name combination'
            });
        }

        // Generate sponsor ID
        const sponsorId = Sponsor.generateSponsorId();

        // Create sponsor record
        const sponsor = new Sponsor({
            sponsorId,
            companyName,
            contactPerson,
            email,
            phone,
            address: address || '',
            website: website || '',
            tier,
            amount: parseFloat(amount),
            paymentMethod,
            paymentStatus: 'pending',
            comments: comments || ''
        });

        // Save to database
        await sponsor.save();

        // Send confirmation email (if email service is configured)
        if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
            await sendSponsorConfirmationEmail(sponsor);
            await sendAdminNotificationEmail(sponsor);
        }

        res.json({
            success: true,
            message: 'Sponsor registration saved successfully',
            sponsorId: sponsor.sponsorId
        });

    } catch (error) {
        console.error('Save sponsor registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save registration. Please try again.'
        });
    }
};

/**
 * Get sponsor registration success page
 */
const getSponsorshipSuccess = async (req, res) => {
    const { sponsorId, sessionId } = req.query;
    
    let sponsor = null;
    if (sponsorId) {
        sponsor = await Sponsor.findOne({ sponsorId: sponsorId });
    }
    
    res.render("sponsorship-success", {
        title: "Thank You",
        description: "Thank you for becoming a sponsor",
        sponsor: sponsor,
        sessionId: sessionId || '',
        layout: "layout"
    });
};

/**
 * Get all sponsors (admin)
 */
const getAllSponsors = async (req, res) => {
    try {
        // In production, add authentication check here
        // if (!req.user || !req.user.isAdmin) {
        //     return res.status(403).json({ error: 'Unauthorized' });
        // }

        const sponsors = await Sponsor.find()
            .sort({ tier: 1, createdAt: -1 })
            .select('-__v');
        
        res.json({
            success: true,
            count: sponsors.length,
            sponsors: sponsors
        });

    } catch (error) {
        console.error('Get sponsors error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sponsors'
        });
    }
};

// Helper Functions

/**
 * Verify Zeffy webhook signature
 */
function verifyZeffySignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return signature === expectedSignature;
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(data) {
    try {
        const { metadata, amount, donorInfo, transactionId } = data;
        
        // Find sponsor by sponsorId from metadata
        const sponsor = await Sponsor.findOne({ sponsorId: metadata.sponsorId });
        
        if (sponsor) {
            // Update payment status
            await sponsor.markPaymentComplete(transactionId);
            
            // Send confirmation emails if email service is configured
            if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
                await sendPaymentConfirmationEmail({
                    email: sponsor.email,
                    companyName: sponsor.companyName,
                    tier: sponsor.tier,
                    amount: sponsor.amount,
                    transactionId: transactionId
                });
            }
            
            console.log(`Payment completed for ${sponsor.companyName} - ${sponsor.tierDisplayName} tier`);
        } else {
            console.error(`Sponsor not found for payment completion: ${metadata.sponsorId}`);
        }

    } catch (error) {
        console.error('Handle payment completed error:', error);
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data) {
    try {
        const { metadata } = data;
        
        // Find and update sponsor
        const sponsor = await Sponsor.findOne({ sponsorId: metadata.sponsorId });
        
        if (sponsor) {
            await sponsor.updatePaymentStatus('failed');
            console.log(`Payment failed for ${sponsor.companyName} - ${sponsor.tierDisplayName} tier`);
        }
        
    } catch (error) {
        console.error('Handle payment failed error:', error);
    }
}

/**
 * Handle cancelled payment
 */
async function handlePaymentCancelled(data) {
    try {
        const { metadata } = data;
        
        // Find and update sponsor
        const sponsor = await Sponsor.findOne({ sponsorId: metadata.sponsorId });
        
        if (sponsor) {
            await sponsor.updatePaymentStatus('cancelled');
            console.log(`Payment cancelled for ${sponsor.companyName} - ${sponsor.tierDisplayName} tier`);
        }
        
    } catch (error) {
        console.error('Handle payment cancelled error:', error);
    }
}

/**
 * Send confirmation email to sponsor
 * Note: Implement actual email sending using nodemailer or similar
 */
async function sendSponsorConfirmationEmail(sponsor) {
    console.log(`Sending confirmation email to ${sponsor.email}`);
    
    // Example with nodemailer (implement when email service is set up)
    /*
    const transporter = nodemailer.createTransporter({...});
    await transporter.sendMail({
        to: sponsor.email,
        subject: `Thank you for sponsoring Alhuda SPARK 2025 - ${sponsor.tierDisplayName} Tier`,
        html: emailTemplate
    });
    */
}

/**
 * Send notification email to admin
 */
async function sendAdminNotificationEmail(sponsor) {
    console.log(`Sending admin notification for new sponsor: ${sponsor.companyName}`);
    // Implement actual email sending
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(data) {
    console.log(`Sending payment confirmation to ${data.email}`);
    // Implement actual email sending
}

module.exports = {
    createZeffyPaymentSession,
    handleZeffyWebhook,
    saveSponsorRegistration,
    getSponsorshipSuccess,
    getAllSponsors
};

function generateSponsorId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `SPR-${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Send confirmation email to sponsor
 */
async function sendSponsorConfirmationEmail(sponsorData) {
    // Implement email sending logic
    // Using nodemailer or similar service
    console.log(`Sending confirmation email to ${sponsorData.email}`);
    
    // Example email content
    const emailContent = {
        to: sponsorData.email,
        subject: `Thank you for sponsoring Alhuda SPARK 2025 - ${sponsorData.tier.charAt(0).toUpperCase() + sponsorData.tier.slice(1)} Tier`,
        html: `
            <h2>Thank you for your sponsorship commitment!</h2>
            <p>Dear ${sponsorData.contactPerson},</p>
            <p>We have received your ${sponsorData.tier} tier sponsorship registration for ${sponsorData.companyName}.</p>
            <p><strong>Sponsorship Details:</strong></p>
            <ul>
                <li>Tier: ${sponsorData.tier.charAt(0).toUpperCase() + sponsorData.tier.slice(1)}</li>
                <li>Amount: $${sponsorData.amount.toLocaleString()}</li>
                <li>Payment Method: ${sponsorData.paymentMethod}</li>
                <li>Reference ID: ${sponsorData.id}</li>
            </ul>
            ${sponsorData.paymentMethod !== 'zeffy' && sponsorData.paymentMethod !== 'stripe' ? 
                `<p>Please complete your payment using the ${sponsorData.paymentMethod} method as instructed.</p>` : 
                ''}
            <p>We will contact you soon with more details about your sponsorship benefits.</p>
            <p>Best regards,<br>Alhuda SPARK Team</p>
        `
    };
    
    // In production, actually send the email
    // await emailService.send(emailContent);
}

/**
 * Send notification email to admin
 */
async function sendAdminNotificationEmail(sponsorData) {
    console.log(`Sending admin notification for new sponsor: ${sponsorData.companyName}`);
    
    // Admin email content
    const emailContent = {
        to: process.env.ADMIN_EMAIL || 'admin@alhudaspark.org',
        subject: `New Sponsor Registration - ${sponsorData.tier} - ${sponsorData.companyName}`,
        html: `
            <h3>New Sponsor Registration</h3>
            <p><strong>Company:</strong> ${sponsorData.companyName}</p>
            <p><strong>Contact:</strong> ${sponsorData.contactPerson}</p>
            <p><strong>Email:</strong> ${sponsorData.email}</p>
            <p><strong>Phone:</strong> ${sponsorData.phone}</p>
            <p><strong>Tier:</strong> ${sponsorData.tier}</p>
            <p><strong>Amount:</strong> $${sponsorData.amount.toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${sponsorData.paymentMethod}</p>
            <p><strong>Status:</strong> ${sponsorData.paymentStatus}</p>
            <p><strong>ID:</strong> ${sponsorData.id}</p>
            ${sponsorData.comments ? `<p><strong>Comments:</strong> ${sponsorData.comments}</p>` : ''}
        `
    };
    
    // In production, actually send the email
    // await emailService.send(emailContent);
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(data) {
    console.log(`Sending payment confirmation to ${data.email}`);
    
    const emailContent = {
        to: data.email,
        subject: `Payment Confirmed - Alhuda SPARK 2025 Sponsorship`,
        html: `
            <h2>Payment Confirmed!</h2>
            <p>Your payment has been successfully processed.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li>Company: ${data.companyName}</li>
                <li>Tier: ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}</li>
                <li>Amount: $${data.amount.toLocaleString()}</li>
                <li>Transaction ID: ${data.transactionId}</li>
            </ul>
            <p>Thank you for supporting Alhuda SPARK 2025!</p>
        `
    };
    
    // In production, actually send the email
    // await emailService.send(emailContent);
}

module.exports = {
    createZeffyPaymentSession,
    handleZeffyWebhook,
    saveSponsorRegistration,
    getSponsorshipSuccess,
    getAllSponsors
};