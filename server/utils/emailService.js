const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('../config/db');

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Generate a random token for email verification or password reset
 * @returns {string} Random token
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Send verification email to user
 * @param {Object} user - User object with email and name
 * @param {string} token - Verification token
 * @returns {Promise} - Nodemailer response
 */
const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>Thank you for registering with the Scientific Infrastructure Booking System. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>This link will expire in ${process.env.VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>
                <p>If you didn't register for an account, you can safely ignore this email.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Send password reset email to user
 * @param {Object} user - User object with email and name
 * @param {string} token - Password reset token
 * @returns {Promise} - Nodemailer response
 */
const sendPasswordResetEmail = async (user, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Reset Your Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>You requested a password reset for your Scientific Infrastructure Booking System account. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #4285F4; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
                <p>This link will expire in ${process.env.PASSWORD_RESET_EXPIRY_HOURS} hours.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// Verify that email service is properly configured
const verifyEmailConfig = async () => {
    try {
        // Verify connection configuration
        await transporter.verify();
        return true;
    } catch (error) {
        return false;
    }
};

// Send booking request notification to infrastructure managers
const sendBookingRequestNotification = async (booking, infrastructure, managers, secureToken) => {
    const approveUrl = `${process.env.FRONTEND_URL}/api/approve/${secureToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/api/reject/${secureToken}`;

    // Get user details
    const [users] = await pool.execute('SELECT name, email FROM users WHERE email = ?', [booking.user_email]);
    const user = users[0] || { name: 'User', email: booking.user_email };

    // Check if all managers have opted out of emails
    const activeManagers = managers.filter(manager => manager.email_notifications);
    if (activeManagers.length === 0) {
        console.log('No active managers to notify');
        return;
    }

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: activeManagers.map(m => m.email).join(','),
        subject: `New Booking Request for ${infrastructure.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Booking Request</h2>
                <p>Hello,</p>
                <p>A new booking request has been submitted for <strong>${infrastructure.name}</strong>.</p>
                
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <p><strong>User:</strong> ${user.name} (${user.email})</p>
                    <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                    <p><strong>Purpose:</strong> ${booking.purpose || 'N/A'}</p>
                    <!-- Additional question answers would be included here -->
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">Approve Request</a>
                    <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reject Request</a>
                </div>
                
                <p>You can also log in to the system to manage this request and view all the details.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/unsubscribe/${manager.email}">unsubscribe</a>.
                </p>
            </div>
        `
    };

    return Promise.all(activeManagers.map(manager => {
        const customMailOptions = { ...mailOptions };
        customMailOptions.to = manager.email;
        return transporter.sendMail(customMailOptions);
    }));
};

// Send booking status update notification to user with calendar invite
const sendBookingStatusUpdate = async (booking, infrastructure, status) => {
    // Get user details from database
    const [users] = await pool.execute('SELECT name, email, email_notifications FROM users WHERE email = ?', [booking.user_email]);
    const user = users[0];

    // Check if user has opted out of emails
    if (!user || !user.email_notifications) {
        console.log('User has opted out of email notifications');
        return;
    }

    // Create subject and message based on status
    let subject, message, color;
    switch (status) {
        case 'approved':
            subject = `Your Booking Request for ${infrastructure.name} was Approved`;
            message = 'Your booking request has been approved.';
            color = '#4CAF50';
            break;
        case 'rejected':
            subject = `Your Booking Request for ${infrastructure.name} was Rejected`;
            message = 'Unfortunately, your booking request has been rejected.';
            color = '#f44336';
            break;
        case 'canceled':
            subject = `Your Booking for ${infrastructure.name} was Canceled`;
            message = 'Your booking has been canceled by an administrator.';
            color = '#ff9800';
            break;
        default:
            subject = `Booking Status Update for ${infrastructure.name}`;
            message = `The status of your booking has been updated to: ${status}.`;
            color = '#2196F3';
    }

    // Generate calendar file for approved bookings
    let icsAttachment = null;
    if (status === 'approved') {
        icsAttachment = generateICSFile(booking, infrastructure);
    }

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${color};">Booking Status Update</h2>
                <p>Hello ${user.name},</p>
                <p>${message}</p>
                
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <p><strong>Infrastructure:</strong> ${infrastructure.name}</p>
                    <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                    <p><strong>Status:</strong> <span style="color: ${color};">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
                </div>
                
                ${status === 'approved' ? `
                <p>A calendar invitation has been attached to this email. You can add it to your calendar application.</p>
                ` : ''}
                
                <p>You can log in to the system to view all your bookings and their statuses.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/unsubscribe/${user.email}">unsubscribe</a>.
                </p>
            </div>
        `,
        attachments: icsAttachment ? [
            {
                filename: 'booking.ics',
                content: icsAttachment,
                contentType: 'text/calendar'
            }
        ] : []
    };

    return transporter.sendMail(mailOptions);
};

// Generate an ICS file for calendar invites
const generateICSFile = (booking, infrastructure) => {
    const ical = require('ical-generator');
    const cal = ical({ name: 'Scientific Infrastructure Booking' });

    // Parse date and times
    const bookingDate = new Date(booking.booking_date);
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);

    const startDate = new Date(bookingDate);
    startDate.setHours(startHour, startMinute, 0);

    const endDate = new Date(bookingDate);
    endDate.setHours(endHour, endMinute, 0);

    // Add event to calendar
    cal.createEvent({
        start: startDate,
        end: endDate,
        summary: `Booking: ${infrastructure.name}`,
        description: booking.purpose || '',
        location: infrastructure.location || '',
        status: 'confirmed',
    });

    return cal.toString();
};

/**
 * Generate a secure token for email actions
 * @param {Object} booking - The booking object
 * @param {string} action - The action type ('approve' or 'reject')
 * @param {Object} connection - Optional database connection for transaction
 * @returns {Promise<string>} - The generated token
 */
const generateSecureActionToken = async (booking, action, connection = null) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24-hour expiry

    try {
        // Use the provided connection (for transactions) or the pool directly
        const db = connection || pool;

        // Store token in database
        await db.execute(
            'INSERT INTO email_action_tokens (token, booking_id, action, expires) VALUES (?, ?, ?, ?)',
            [token, booking.id, action, expires]
        );

        return token;
    } catch (error) {
        console.error('Error generating secure action token:', error);
        // Return a fallback token if there's an error
        // This allows the process to continue even if token storage fails
        return `${action}_${booking.id}_${Date.now()}`;
    }
};

module.exports = {
    generateToken,
    sendVerificationEmail,
    sendPasswordResetEmail,
    verifyEmailConfig,
    sendBookingRequestNotification,
    sendBookingStatusUpdate,
    generateSecureActionToken
};
