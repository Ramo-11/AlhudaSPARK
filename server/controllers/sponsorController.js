// Sponsor Controller for handling non-payment gateway registrations
const Sponsor = require('../../models/Sponsor');
const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    // Using Gmail as example - replace with your email service
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

/**
 * Handle sponsor registration for manual payment methods
 */
const registerSponsor = async (req, res) => {
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

        // Check if sponsor already exists with same email and tier
        const existingSponsor = await Sponsor.findOne({
            email: email.toLowerCase(),
            tier: tier,
            paymentStatus: { $in: ['pending', 'processing', 'completed'] }
        });

        if (existingSponsor) {
            return res.status(400).json({
                success: false,
                error: 'A sponsorship registration already exists for this email and tier combination'
            });
        }

        // Generate sponsor ID
        const sponsorId = Sponsor.generateSponsorId();

        // Create sponsor record
        const sponsor = new Sponsor({
            sponsorId,
            companyName,
            contactPerson,
            email: email.toLowerCase(),
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

        // Send confirmation email to sponsor
        await sendSponsorConfirmationEmail(sponsor);

        // Send notification to admin
        await sendAdminNotificationEmail(sponsor);

        // Return success with payment instructions
        const instructions = getPaymentInstructions(sponsor);

        res.json({
            success: true,
            message: 'Sponsor registration saved successfully',
            sponsorId: sponsor.sponsorId,
            instructions: instructions
        });

    } catch (error) {
        console.error('Sponsor registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save registration. Please try again or contact support.'
        });
    }
};

/**
 * Get payment instructions based on payment method
 */
const getPaymentInstructions = (sponsor) => {
    const instructions = {
        'check': {
            title: 'Payment by Check',
            text: 'Please make your check payable to "Alhuda SPARK" and mail it to:',
            details: `
                <strong>Alhuda SPARK</strong><br>
                ${process.env.MAILING_ADDRESS || '123 Main Street<br>Indianapolis, IN 46201'}<br><br>
                <strong>Amount:</strong> $${sponsor.amount.toLocaleString()}<br>
                <strong>Memo:</strong> ${sponsor.tierDisplayName} Sponsorship - ${sponsor.companyName}<br>
                <strong>Reference:</strong> ${sponsor.sponsorId}
            `
        },
        'zelle': {
            title: 'Payment by Zelle',
            text: 'Please send your Zelle payment using the following information:',
            details: `
                <strong>Recipient Email:</strong> ${process.env.ZELLE_EMAIL || 'finance@alhudaspark.org'}<br>
                <strong>Recipient Name:</strong> Alhuda SPARK<br>
                <strong>Amount:</strong> $${sponsor.amount.toLocaleString()}<br>
                <strong>Memo:</strong> ${sponsor.sponsorId}
            `
        },
        'venmo': {
            title: 'Payment by Venmo',
            text: 'Please send your Venmo payment to:',
            details: `
                <strong>Venmo Username:</strong> ${process.env.VENMO_USERNAME || '@AlhudaSPARK'}<br>
                <strong>Amount:</strong> $${sponsor.amount.toLocaleString()}<br>
                <strong>Note:</strong> ${sponsor.sponsorId} - ${sponsor.companyName}
            `
        }
    };

    return instructions[sponsor.paymentMethod] || null;
};

/**
 * Send confirmation email to sponsor
 */
const sendSponsorConfirmationEmail = async (sponsor) => {
    try {
        const transporter = createTransporter();
        const instructions = getPaymentInstructions(sponsor);
        
        const tierBenefits = {
            'diamond': [
                'Premium logo placement on all marketing materials',
                'Main stage banner display throughout event',
                '10-minute presentation opportunity during opening ceremony',
                'VIP booth space at prime location',
                '20 complimentary event passes',
                'Full-page ad in tournament program',
                'Social media spotlight campaign',
                'Trophy presentation rights'
            ],
            'platinum': [
                'Prominent logo placement on marketing materials',
                'Court-side banner display',
                '5-minute presentation during event',
                'Premium booth space',
                '15 complimentary event passes',
                'Half-page ad in tournament program',
                'Social media recognition',
                'Award presentation opportunity'
            ],
            'gold': [
                'Logo on event website and program',
                'Venue banner display',
                'Standard booth space',
                '10 complimentary event passes',
                'Quarter-page ad in program',
                'Social media mentions',
                'Recognition during ceremonies'
            ],
            'silver': [
                'Logo on event website',
                'Name listing in program',
                '5 complimentary event passes',
                'Certificate of appreciation',
                'Social media thank you post',
                'Recognition on sponsor board'
            ]
        };

        const benefitsList = tierBenefits[sponsor.tier].map(b => `<li>${b}</li>`).join('');

        const emailContent = {
            from: `"Alhuda SPARK" <${process.env.EMAIL_USER}>`,
            to: sponsor.email,
            subject: `Thank You for Your ${sponsor.tierDisplayName} Sponsorship - Alhuda SPARK 2025`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #d0a764, #827153); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d0a764; }
                        .benefits-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                        .payment-box { background: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #d0a764; }
                        h1 { margin: 0; }
                        h2 { color: #d0a764; }
                        h3 { color: #827153; }
                        ul { padding-left: 20px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                        .button { display: inline-block; padding: 12px 30px; background: #d0a764; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Thank You for Your Sponsorship!</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${sponsor.contactPerson},</p>
                            
                            <p>Thank you for committing to be a <strong>${sponsor.tierDisplayName} Sponsor</strong> for Alhuda SPARK 2025! Your support will make a tremendous impact on our youth development programs.</p>
                            
                            <div class="info-box">
                                <h3>Your Sponsorship Details</h3>
                                <p>
                                    <strong>Company:</strong> ${sponsor.companyName}<br>
                                    <strong>Sponsorship Level:</strong> ${sponsor.tierDisplayName}<br>
                                    <strong>Amount:</strong> $${sponsor.amount.toLocaleString()}<br>
                                    <strong>Reference ID:</strong> ${sponsor.sponsorId}<br>
                                    <strong>Payment Method:</strong> ${sponsor.paymentMethod.charAt(0).toUpperCase() + sponsor.paymentMethod.slice(1)}
                                </p>
                            </div>
                            
                            ${instructions ? `
                            <div class="payment-box">
                                <h3>${instructions.title}</h3>
                                <p>${instructions.text}</p>
                                <div>${instructions.details}</div>
                            </div>
                            ` : ''}
                            
                            <div class="benefits-box">
                                <h3>Your ${sponsor.tierDisplayName} Benefits Include:</h3>
                                <ul>
                                    ${benefitsList}
                                </ul>
                            </div>
                            
                            <h3>Next Steps</h3>
                            <ol>
                                <li>Complete your payment using the instructions above</li>
                                <li>Our team will confirm receipt of your payment</li>
                                <li>We'll send you detailed information about logo submission and benefit activation</li>
                                <li>You'll receive regular updates leading up to the event</li>
                            </ol>
                            
                            <p>If you have any questions or need assistance, please don't hesitate to contact us:</p>
                            <p>
                                <strong>Email:</strong> sponsors@alhudaspark.org<br>
                                <strong>Phone:</strong> (317) 555-1234
                            </p>
                            
                            <p>We look forward to partnering with you for this exciting event!</p>
                            
                            <p>Warm regards,<br>
                            The Alhuda SPARK Team</p>
                        </div>
                        <div class="footer">
                            <p>Alhuda SPARK | November 1-2, 2025 | Mojo Up, Noblesville, IN</p>
                            <p>This is an automated email. Please do not reply directly to this message.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(emailContent);
        console.log(`Confirmation email sent to ${sponsor.email}`);
        
    } catch (error) {
        console.error('Error sending sponsor confirmation email:', error);
        // Don't throw - we don't want to fail the registration if email fails
    }
};

/**
 * Send notification email to admin
 */
const sendAdminNotificationEmail = async (sponsor) => {
    try {
        const transporter = createTransporter();
        
        const emailContent = {
            from: `"Alhuda SPARK System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAILS || 'admin@alhudaspark.org', // Can be comma-separated list
            subject: `New ${sponsor.tierDisplayName} Sponsor Registration - ${sponsor.companyName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                        .content { background: #f8f9fa; padding: 20px; }
                        .info-table { width: 100%; border-collapse: collapse; background: white; }
                        .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
                        .info-table td:first-child { font-weight: bold; width: 40%; }
                        .tier-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
                        .tier-diamond { background: #e3f2fd; color: #1565c0; }
                        .tier-platinum { background: #f3e5f5; color: #6a1b9a; }
                        .tier-gold { background: #fff8e1; color: #f57c00; }
                        .tier-silver { background: #f5f5f5; color: #616161; }
                        .action-required { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Sponsor Registration</h2>
                            <span class="tier-badge tier-${sponsor.tier}">${sponsor.tierDisplayName}</span>
                        </div>
                        <div class="content">
                            <table class="info-table">
                                <tr>
                                    <td>Sponsor ID:</td>
                                    <td>${sponsor.sponsorId}</td>
                                </tr>
                                <tr>
                                    <td>Company Name:</td>
                                    <td>${sponsor.companyName}</td>
                                </tr>
                                <tr>
                                    <td>Contact Person:</td>
                                    <td>${sponsor.contactPerson}</td>
                                </tr>
                                <tr>
                                    <td>Email:</td>
                                    <td><a href="mailto:${sponsor.email}">${sponsor.email}</a></td>
                                </tr>
                                <tr>
                                    <td>Phone:</td>
                                    <td>${sponsor.phone}</td>
                                </tr>
                                <tr>
                                    <td>Address:</td>
                                    <td>${sponsor.address || 'Not provided'}</td>
                                </tr>
                                <tr>
                                    <td>Website:</td>
                                    <td>${sponsor.website || 'Not provided'}</td>
                                </tr>
                                <tr>
                                    <td>Sponsorship Tier:</td>
                                    <td><strong>${sponsor.tierDisplayName}</strong></td>
                                </tr>
                                <tr>
                                    <td>Amount:</td>
                                    <td><strong>$${sponsor.amount.toLocaleString()}</strong></td>
                                </tr>
                                <tr>
                                    <td>Payment Method:</td>
                                    <td>${sponsor.paymentMethod.charAt(0).toUpperCase() + sponsor.paymentMethod.slice(1)}</td>
                                </tr>
                                <tr>
                                    <td>Payment Status:</td>
                                    <td>${sponsor.paymentStatus}</td>
                                </tr>
                                <tr>
                                    <td>Registration Date:</td>
                                    <td>${new Date(sponsor.createdAt).toLocaleString()}</td>
                                </tr>
                                ${sponsor.comments ? `
                                <tr>
                                    <td>Comments:</td>
                                    <td>${sponsor.comments}</td>
                                </tr>
                                ` : ''}
                            </table>
                            
                            <div class="action-required">
                                <h3>⚠️ Action Required</h3>
                                <p>Payment Method: <strong>${sponsor.paymentMethod.toUpperCase()}</strong></p>
                                <p>Please monitor for incoming payment and update the sponsor record once payment is received.</p>
                                ${sponsor.paymentMethod === 'check' ? '<p>Watch for check arrival via mail.</p>' : ''}
                                ${sponsor.paymentMethod === 'zelle' ? '<p>Check Zelle account for incoming transfer.</p>' : ''}
                                ${sponsor.paymentMethod === 'venmo' ? '<p>Check Venmo account for incoming payment.</p>' : ''}
                            </div>
                            
                            <p><a href="${process.env.BASE_URL}/admin/sponsors" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View All Sponsors</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(emailContent);
        console.log(`Admin notification sent for ${sponsor.companyName}`);
        
    } catch (error) {
        console.error('Error sending admin notification email:', error);
        // Don't throw - we don't want to fail the registration if email fails
    }
};

module.exports = {
    registerSponsor
};