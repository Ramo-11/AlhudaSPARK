// Team Controller for handling team registrations with Cloudinary file uploads
const Team = require('../../models/Team');
const nodemailer = require('nodemailer');
const { upload, uploadImageToCloudinary, deleteImageFromCloudinary } = require('./cloudinaryController');
const { logger } = require('../logger');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

/**
 * Handle team registration with Cloudinary file uploads
 */
const registerTeam = async (req, res) => {
    let uploadedImages = []; // Keep track of uploaded images for cleanup on error
    
    try {
        logger.info('Processing team registration request');
        const {
            teamName,
            organization,
            city,
            tier,
            gender,
            coachName,
            coachEmail,
            coachPhone,
            emergencyContact,
            paymentMethod,
            specialRequirements,
            comments
        } = req.body;

        // Validate required fields
        if (!teamName || !organization || !city || !tier || !gender || 
            !coachName || !coachEmail || !coachPhone || !paymentMethod) {
            logger.warn('Missing required fields in team registration');
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate emergency contact
        if (!emergencyContact || !emergencyContact.name || 
            !emergencyContact.phone || !emergencyContact.relationship) {
            logger.warn('Missing emergency contact information');
            return res.status(400).json({
                success: false,
                error: 'Emergency contact information is required'
            });
        }

        logger.debug(`Received team registration request: ${JSON.stringify(req.body)}`);
        const teamId = Team.generateTeamId();
        
        // Process players data with Cloudinary uploads
        const playersData = await processPlayersDataWithCloudinary(req.body, req.files, teamId);
        uploadedImages = playersData.uploadedImages || [];
        
        if (!playersData.success) {
            logger.warn(`Player data processing error: ${playersData.error}`);
            return res.status(400).json({
                success: false,
                error: playersData.error
            });
        }

        // Check if team already exists with same coach email and team name
        const existingTeam = await Team.findOne({
            coachEmail: coachEmail.toLowerCase(),
            teamName: teamName,
            registrationStatus: { $in: ['pending', 'approved', 'waitlisted'] }
        });

        if (existingTeam) {
            logger.warn(`Team already exists: ${teamName} (${coachEmail})`);
            // Cleanup uploaded images
            await cleanupCloudinaryImages(uploadedImages);
            return res.status(400).json({
                success: false,
                error: 'A team with this name and coach email already exists'
            });
        }
        const fees = Team.getRegistrationFees();
        const registrationFee = fees[tier] || 350;

        // Create team record
        const team = new Team({
            teamId,
            teamName,
            organization,
            city,
            tier,
            gender,
            coachName,
            coachEmail: coachEmail.toLowerCase(),
            coachPhone,
            players: playersData.players,
            emergencyContact: {
                name: emergencyContact.name,
                phone: emergencyContact.phone,
                relationship: emergencyContact.relationship
            },
            registrationFee,
            paymentMethod,
            paymentStatus: 'pending',
            specialRequirements: specialRequirements || '',
            comments: comments || ''
        });

        logger.info(`Registering team: ${teamName} (${teamId}) with ${team.players.length} players`);

        // Calculate and validate player ages
        team.calculatePlayerAges();
        
        if (!team.validatePlayerAgesForTier()) {
            logger.error(`Player age validation failed for team: ${teamName} (${teamId})`);
            // Clean up uploaded images if age validation fails
            await cleanupCloudinaryImages(uploadedImages);
            return res.status(400).json({
                success: false,
                error: `Player ages must be within the ${tier} tier age range`
            });
        }

        // Save to database
        await team.save();

        // Send confirmation email to coach
        await sendTeamConfirmationEmail(team);

        // Send notification to admin
        await sendAdminNotificationEmail(team);

        // Return success with payment instructions
        const instructions = getPaymentInstructions(team);

        res.json({
            success: true,
            message: 'Team registration saved successfully',
            teamId: team.teamId,
            instructions: instructions
        });

    } catch (error) {
        logger.error('Error saving team registration:', error);
        
        // Clean up any uploaded images on error
        if (uploadedImages.length > 0) {
            await cleanupCloudinaryImages(uploadedImages);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to save registration. Please try again or contact support.'
        });
    }
};

/**
 * Process players data from form and upload files to Cloudinary
 */
const processPlayersDataWithCloudinary = async (body, files, teamId) => {
    const uploadedImages = [];
    
    try {
        const players = [];
        const playerFiles = files || [];
        const requireIds = (body.tier === 'high_school');
        const teamFolderName = `${body.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${teamId}`;

        // Extract player data from form fields
        let playerIndex = 0;
        while (body.players[playerIndex]) {
            logger.debug(`Processing player ${playerIndex + 1}`);
            const playerName = body.players[playerIndex].playerName;
            const dateOfBirth = body.players[playerIndex].dateOfBirth;

            logger.debug(`Player ${playerIndex + 1} - Name: ${playerName}, DOB: ${dateOfBirth}`);

            if (!playerName || !dateOfBirth) {
                // Cleanup any images uploaded so far
                await cleanupCloudinaryImages(uploadedImages);
                return {
                    success: false,
                    error: `Player ${playerIndex + 1}: Name and date of birth are required`
                };
            }

            // Find corresponding file
            const playerFile = playerFiles.find(file => 
                file.fieldname === `players[${playerIndex}][idPhoto]`
            );

            if (requireIds && !playerFile) {
                // Cleanup any images uploaded so far
                await cleanupCloudinaryImages(uploadedImages);
                return {
                    success: false,
                    error: `Player ${playerIndex + 1}: ID photo is required`
                };
            }

            let cloudinaryResult = null;
            if (playerFile) {
                try {
                    // Upload to Cloudinary with team-specific folder
                    cloudinaryResult = await uploadImageToCloudinary(playerFile.buffer, {
                        folder: `alhuda_spark/${teamFolderName}/${playerName.replace(/[^a-zA-Z0-9]/g, '_')}_${playerIndex + 1}`,
                        transformation: [
                            { width: 800, height: 600, crop: 'limit' },
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    
                    uploadedImages.push(cloudinaryResult.public_id);
                    logger.debug(`Uploaded player ${playerIndex + 1} ID to Cloudinary: ${cloudinaryResult.public_id}`);
                    
                } catch (uploadError) {
                    logger.error(`Error uploading player ${playerIndex + 1} ID to Cloudinary:`, uploadError);
                    // Cleanup any images uploaded so far
                    await cleanupCloudinaryImages(uploadedImages);
                    return {
                        success: false,
                        error: `Failed to upload ID photo for player ${playerIndex + 1}`
                    };
                }
            }

            players.push({
                playerName: playerName.trim(),
                dateOfBirth: new Date(dateOfBirth),
                idPhotoUrl: cloudinaryResult?.secure_url || null,
                idPhotoPublicId: cloudinaryResult?.public_id || null,
                idPhotoOriginalName: playerFile?.originalname || null,
                ageAtRegistration: 0 // Will be calculated by the model
            });

            playerIndex++;
        }

        // Validate player count
        if (players.length < 5) {
            logger.warn(`Insufficient players for team registration: ${players.length}`);
            await cleanupCloudinaryImages(uploadedImages);
            return {
                success: false,
                error: 'Minimum 5 player required'
            };
        }

        if (players.length > 10) {
            logger.warn('Too many players for team registration');
            await cleanupCloudinaryImages(uploadedImages);
            return {
                success: false,
                error: 'Maximum 10 players allowed'
            };
        }

        return {
            success: true,
            players: players,
            uploadedImages: uploadedImages
        };

    } catch (error) {
        logger.error('Error processing player data:', error);
        await cleanupCloudinaryImages(uploadedImages);
        return {
            success: false,
            error: 'Error processing player data'
        };
    }
};

/**
 * Clean up uploaded images from Cloudinary
 */
const cleanupCloudinaryImages = async (publicIds) => {
    if (!publicIds || publicIds.length === 0) return;
    
    try {
        await Promise.all(publicIds.map(publicId => 
            deleteImageFromCloudinary(publicId).catch(error => 
                logger.error(`Failed to delete image ${publicId}:`, error)
            )
        ));
        logger.info(`Cleaned up ${publicIds.length} images from Cloudinary`);
    } catch (error) {
        logger.error('Error cleaning up Cloudinary images:', error);
    }
};

/**
 * Get payment instructions based on payment method
 */
const getPaymentInstructions = (team) => {
    const instructions = {
        'check': {
            title: 'Payment by Check',
            text: 'Please make your check payable to "Alhuda SPARK" and mail it to:',
            details: `
                <strong>Alhuda SPARK</strong><br>
                ${process.env.MAILING_ADDRESS || '123 Main Street<br>Indianapolis, IN 46201'}<br><br>
                <strong>Amount:</strong> $${team.registrationFee.toLocaleString()}<br>
                <strong>Memo:</strong> Team Registration - ${team.teamName}<br>
                <strong>Reference:</strong> ${team.teamId}
            `
        },
        'zelle': {
            title: 'Payment by Zelle',
            text: 'Please send your Zelle payment using the following information:',
            details: `
                <strong>Recipient Email:</strong> ${process.env.ZELLE_EMAIL || 'finance@alhudaspark.org'}<br>
                <strong>Recipient Name:</strong> Alhuda SPARK<br>
                <strong>Amount:</strong> $${team.registrationFee.toLocaleString()}<br>
                <strong>Memo:</strong> ${team.teamId}
            `
        },
        'venmo': {
            title: 'Payment by Venmo',
            text: 'Please send your Venmo payment to:',
            details: `
                <strong>Venmo Username:</strong> ${process.env.VENMO_USERNAME || '@AlhudaSPARK'}<br>
                <strong>Amount:</strong> $${team.registrationFee.toLocaleString()}<br>
                <strong>Note:</strong> ${team.teamId} - ${team.teamName}
            `
        }
    };

    return instructions[team.paymentMethod] || null;
};

/**
 * Send confirmation email to team coach
 */
const sendTeamConfirmationEmail = async (team) => {
    try {
        const transporter = createTransporter();
        const instructions = getPaymentInstructions(team);
        
        const playersTable = team.players.map((player, index) => 
            `<tr>
                <td>${index + 1}</td>
                <td>${player.playerName}</td>
                <td>${player.ageAtRegistration} years</td>
            </tr>`
        ).join('');

        const emailContent = {
            from: `"Alhuda SPARK" <${process.env.EMAIL_USER}>`,
            to: team.coachEmail,
            subject: `Team Registration Confirmation - ${team.teamName} - Alhuda SPARK 2025`,
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
                        .players-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                        .payment-box { background: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #d0a764; }
                        .players-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        .players-table th, .players-table td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
                        .players-table th { background: #f8f9fa; font-weight: bold; }
                        h1 { margin: 0; }
                        h2 { color: #d0a764; }
                        h3 { color: #827153; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                        .tier-badge { display: inline-block; padding: 5px 15px; background: #d0a764; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Team Registration Confirmed!</h1>
                            <span class="tier-badge">${team.tierDisplayName} - ${team.genderDisplayName}</span>
                        </div>
                        <div class="content">
                            <p>Dear Coach ${team.coachName},</p>
                            
                            <p>Thank you for registering <strong>${team.teamName}</strong> for Alhuda SPARK 2025! Your team registration has been successfully submitted.</p>
                            
                            <div class="info-box">
                                <h3>Team Registration Details</h3>
                                <p>
                                    <strong>Team Name:</strong> ${team.teamName}<br>
                                    <strong>Organization:</strong> ${team.organization}<br>
                                    <strong>City:</strong> ${team.city}<br>
                                    <strong>Tier:</strong> ${team.tierDisplayName}<br>
                                    <strong>Gender:</strong> ${team.genderDisplayName}<br>
                                    <strong>Registration Fee:</strong> $${team.registrationFee.toLocaleString()}<br>
                                    <strong>Team ID:</strong> ${team.teamId}<br>
                                    <strong>Payment Method:</strong> ${team.paymentMethod.charAt(0).toUpperCase() + team.paymentMethod.slice(1)}
                                </p>
                            </div>
                            
                            ${instructions ? `
                            <div class="payment-box">
                                <h3>${instructions.title}</h3>
                                <p>${instructions.text}</p>
                                <div>${instructions.details}</div>
                            </div>
                            ` : ''}
                            
                            <div class="players-box">
                                <h3>Registered Players (${team.playerCount})</h3>
                                <table class="players-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Player Name</th>
                                            <th>Age</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${playersTable}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="info-box">
                                <h3>Emergency Contact</h3>
                                <p>
                                    <strong>Name:</strong> ${team.emergencyContact.name}<br>
                                    <strong>Phone:</strong> ${team.emergencyContact.phone}<br>
                                    <strong>Relationship:</strong> ${team.emergencyContact.relationship}
                                </p>
                            </div>
                            
                            <h3>Next Steps</h3>
                            <ol>
                                <li>Complete your payment using the instructions above</li>
                                <li>Our team will review your registration and player documents</li>
                                <li>You'll receive confirmation once payment is received and documents are approved</li>
                                <li>Tournament schedule and group assignments will be sent closer to the event date</li>
                            </ol>
                            
                            <p>If you have any questions or need assistance, please don't hesitate to contact us:</p>
                            <p>
                                <strong>Email:</strong> teams@alhudaspark.org<br>
                                <strong>Phone:</strong> (317) 537-7245
                            </p>
                            
                            <p>We're excited to have ${team.teamName} participate in Alhuda SPARK 2025!</p>
                            
                            <p>Best regards,<br>
                            The Alhuda SPARK Team</p>
                        </div>
                        <div class="footer">
                            <p>Alhuda SPARK Basketball Tournament 2025 | November 1-2, 2025 | Mojo Up, Noblesville, IN</p>
                            <p>This is an automated email. Please do not reply directly to this message.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(emailContent);
        console.log(`Confirmation email sent to ${team.coachEmail}`);
        
    } catch (error) {
        console.error('Error sending team confirmation email:', error);
        // Don't throw - we don't want to fail the registration if email fails
    }
};

/**
 * Send notification email to admin
 */
const sendAdminNotificationEmail = async (team) => {
    try {
        const transporter = createTransporter();
        
        const playersTable = team.players.map((player, index) => 
            `<tr>
                <td>${index + 1}</td>
                <td>${player.playerName}</td>
                <td>${player.ageAtRegistration}</td>
                <td>${player.idPhotoUrl ? `<a href="${player.idPhotoUrl}" target="_blank">View ID</a>` : 'No ID'}</td>
            </tr>`
        ).join('');

        const emailContent = {
            from: `"Alhuda SPARK System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAILS || 'admin@alhudaspark.org',
            subject: `New Team Registration - ${team.teamName} (${team.tierDisplayName})`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                        .content { background: #f8f9fa; padding: 20px; }
                        .info-table { width: 100%; border-collapse: collapse; background: white; margin: 10px 0; }
                        .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
                        .info-table td:first-child { font-weight: bold; width: 35%; }
                        .players-table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; }
                        .players-table th, .players-table td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
                        .players-table th { background: #f8f9fa; font-weight: bold; }
                        .tier-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
                        .tier-elementary { background: #e8f5e8; color: #2e7d2e; }
                        .tier-middle { background: #fff3cd; color: #856404; }
                        .tier-high_school { background: #f8d7da; color: #721c24; }
                        .action-required { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Team Registration</h2>
                            <span class="tier-badge tier-${team.tier}">${team.tierDisplayName} - ${team.genderDisplayName}</span>
                        </div>
                        <div class="content">
                            <h3>Team Information</h3>
                            <table class="info-table">
                                <tr>
                                    <td>Team ID:</td>
                                    <td>${team.teamId}</td>
                                </tr>
                                <tr>
                                    <td>Team Name:</td>
                                    <td>${team.teamName}</td>
                                </tr>
                                <tr>
                                    <td>Organization:</td>
                                    <td>${team.organization}</td>
                                </tr>
                                <tr>
                                    <td>City:</td>
                                    <td>${team.city}</td>
                                </tr>
                                <tr>
                                    <td>Tier:</td>
                                    <td>${team.tierDisplayName}</td>
                                </tr>
                                <tr>
                                    <td>Gender:</td>
                                    <td>${team.genderDisplayName}</td>
                                </tr>
                                <tr>
                                    <td>Player Count:</td>
                                    <td>${team.playerCount}</td>
                                </tr>
                                <tr>
                                    <td>Registration Fee:</td>
                                    <td>$${team.registrationFee.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>Payment Method:</td>
                                    <td>${team.paymentMethod.charAt(0).toUpperCase() + team.paymentMethod.slice(1)}</td>
                                </tr>
                                <tr>
                                    <td>Registration Date:</td>
                                    <td>${new Date(team.createdAt).toLocaleString()}</td>
                                </tr>
                            </table>

                            <h3>Coach Information</h3>
                            <table class="info-table">
                                <tr>
                                    <td>Coach Name:</td>
                                    <td>${team.coachName}</td>
                                </tr>
                                <tr>
                                    <td>Coach Email:</td>
                                    <td><a href="mailto:${team.coachEmail}">${team.coachEmail}</a></td>
                                </tr>
                                <tr>
                                    <td>Coach Phone:</td>
                                    <td>${team.coachPhone}</td>
                                </tr>
                            </table>

                            <h3>Emergency Contact</h3>
                            <table class="info-table">
                                <tr>
                                    <td>Name:</td>
                                    <td>${team.emergencyContact.name}</td>
                                </tr>
                                <tr>
                                    <td>Phone:</td>
                                    <td>${team.emergencyContact.phone}</td>
                                </tr>
                                <tr>
                                    <td>Relationship:</td>
                                    <td>${team.emergencyContact.relationship}</td>
                                </tr>
                            </table>

                            <h3>Players</h3>
                            <table class="players-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Player Name</th>
                                        <th>Age</th>
                                        <th>ID Photo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${playersTable}
                                </tbody>
                            </table>

                            ${team.specialRequirements ? `
                            <h3>Special Requirements</h3>
                            <p>${team.specialRequirements}</p>
                            ` : ''}

                            ${team.comments ? `
                            <h3>Additional Comments</h3>
                            <p>${team.comments}</p>
                            ` : ''}
                            
                            <div class="action-required">
                                <h3>⚠️ Action Required</h3>
                                <p><strong>Payment Method:</strong> ${team.paymentMethod.toUpperCase()}</p>
                                <p><strong>Document Review:</strong> Player ID photos stored in Cloudinary need verification</p>
                                <p>Please monitor for incoming payment and review uploaded documents.</p>
                                ${team.paymentMethod === 'check' ? '<p>Watch for check arrival via mail.</p>' : ''}
                                ${team.paymentMethod === 'zelle' ? '<p>Check Zelle account for incoming transfer.</p>' : ''}
                                ${team.paymentMethod === 'venmo' ? '<p>Check Venmo account for incoming payment.</p>' : ''}
                            </div>
                            
                            <p><a href="${process.env.BASE_URL}/admin/teams" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View All Teams</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(emailContent);
        console.log(`Admin notification sent for ${team.teamName}`);
        
    } catch (error) {
        console.error('Error sending admin notification email:', error);
        // Don't throw - we don't want to fail the registration if email fails
    }
};

module.exports = {
    registerTeam
};