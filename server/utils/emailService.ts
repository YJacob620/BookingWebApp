import nodemailer from 'nodemailer';
import pool from '../configuration/db';
import ical, { ICalEventStatus } from 'ical-generator';
import {
    User,
    BookingEntry,
    Infrastructure,
    generateToken,
    findUserByIdOrEmail
} from './'


// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST as string,
    port: parseInt(process.env.EMAIL_PORT as string, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USERNAME as string,
        pass: process.env.EMAIL_PASSWORD as string
    }
});


/**
 * Send verification email to user
 * @param email - The email of the user
 * @param name - The name of the user
 * @param token - Verification token
 * @returns Nodemailer response
 */
const sendVerificationEmail = async (email: string, name: string, token: string): Promise<any> => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Hello ${name || 'there'},</p>
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
 * @param user - User object with email and name
 * @param token - Password reset token
 * @returns Nodemailer response
 */
const sendPasswordResetEmail = async (user: User, token: string): Promise<any> => {
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

/**
 * Verify that email service is properly configured
 * @returns Boolean indicating if email config is valid
 */
const verifyEmailConfig = async (): Promise<boolean> => {
    try {
        // Verify connection configuration
        await transporter.verify();
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Main wrapper function that handles all booking related email-notifications asynchronously
 * @param booking - Booking details
 * @param infrastructure - Infrastructure details
 * @param managers - List of infrastructure managers
 * @param secureToken - Token for action links
 * @returns Resolves immediately, processes notifications in background
 */
const sendBookingNotifications = async (
    booking: BookingEntry,
    infrastructure: Infrastructure,
    managers: User[],
    secureToken: string
): Promise<boolean> => {
    // Immediately return a promise that resolves
    return new Promise((resolve) => {
        // Use process.nextTick to run notifications in the background
        process.nextTick(async () => {
            try {
                await sendBookingNotificationToManagers(booking, infrastructure, managers, secureToken);
                await sendBookingNotificationToUser(booking, infrastructure);
                resolve(true);
            } catch (error) {
                console.error('Error sending booking notifications in background:', error);
                resolve(false);
            }
        });
        // Resolve the original promise immediately
        resolve(true);
    });
};

/**
 * Send booking request notification to infrastructure managers
 * @param booking - Booking details
 * @param infrastructure - Infrastructure details
 * @param managers - List of infrastructure managers
 * @param actionToken - Token for action links
 * @returns Nodemailer response
 */
const sendBookingNotificationToManagers = async (
    booking: BookingEntry,
    infrastructure: Infrastructure,
    managers: User[],
    actionToken: string
): Promise<any[] | undefined> => {
    // Check if all managers have opted out of emails
    const activeManagers = managers.filter(manager => manager.email_notifications == 1);
    if (activeManagers.length === 0) {
        return;
    }

    try {
        // Create links for approval/rejection via email buttons
        const approveUrl = `${process.env.FRONTEND_URL}/email-action/approve/${actionToken}`;
        const rejectUrl = `${process.env.FRONTEND_URL}/email-action/reject/${actionToken}`;

        // Generate calendar file for the pending booking request
        const user = await findUserByIdOrEmail({ email: booking.user_email });
        const icsAttachment = generateICSFile(booking, infrastructure, user);

        // Send email to each manager individually
        return Promise.all(activeManagers.map(manager => {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
                to: manager.email,
                subject: `New Booking Request for ${infrastructure.name}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Booking Request</h2>
                    <p>Hello ${manager.name || 'Infrastructure Manager'},</p>
                    <p>A new booking request has been submitted for <strong>${infrastructure.name}</strong>.</p>
                    
                    <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                        <p><strong>User:</strong> ${user.name} (${user.email})</p>
                        <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                        <p><strong>Purpose:</strong> ${booking.purpose || 'N/A'}</p>
                    </div>
                    
                    ${actionToken ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">Approve Request</a>
                        <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reject Request</a>
                    </div>
                    ` : ''}
                    
                    <p>A calendar invitation for this pending request has been attached to this email. You can add it to your calendar application to keep track of it while you consider approval.</p>
                    
                    <p>You can also log in to the system to manage this request and view all the details.</p>
                    <p>Best regards,<br>Scientific Infrastructure Team</p>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/preferences/user-manager/unsubscribe/${manager.email}">unsubscribe</a>.
                    </p>
                </div>
            `,
                attachments: [
                    {
                        filename: 'pending_booking_request.ics',
                        content: icsAttachment,
                        contentType: 'text/calendar'
                    }
                ]
            };

            return transporter.sendMail(mailOptions);
        }));
    } catch (error) {
        console.error('Error sending email to managers:', error);
    }
};

/**
 * Send booking request confirmation to the user
 * @param booking - Booking details
 * @param infrastructure - Infrastructure details
 * @returns Nodemailer response
 */
const sendBookingNotificationToUser = async (
    booking: BookingEntry,
    infrastructure: Infrastructure
): Promise<any | undefined> => {
    try {
        const user = await findUserByIdOrEmail({ email: booking.user_email });

        // Check if user has email notifications enabled
        if (user.email_notifications != 1) {
            return;
        }

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: `Booking Request Received for ${infrastructure.name}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Booking Request Received</h2>
                <p>Hello ${user.name},</p>
                <p>We have received your booking request for <strong>${infrastructure.name}</strong>.</p>
                
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                    <p><strong>Purpose:</strong> ${booking.purpose || 'N/A'}</p>
                    <p><strong>Status:</strong> <span style="color: #FF9800;">Pending</span></p>
                </div>
                
                <p>An infrastructure manager will review your request shortly. You will receive another email when your request is approved or rejected.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/preferences/user-manager/unsubscribe/${user.email}">unsubscribe</a>.
                </p>
            </div>
        `
        };

        return transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email to user:', error);
    }
};

/**
 * Send booking status update notification to user with calendar invite (asynchronously)
 * @param booking - Booking details
 * @param infrastructure - Infrastructure details
 * @param status - Updated booking status
 * @returns Promise that resolves immediately
 */
const sendBookingStatusUpdate = async (
    booking: BookingEntry,
    infrastructure: Infrastructure,
    status: string
): Promise<boolean> => {
    // Immediately return a promise that resolves
    return new Promise((resolve) => {
        // Use process.nextTick to run notifications in the background
        process.nextTick(async () => {
            try {
                const user = await findUserByIdOrEmail({ email: booking.user_email });

                // Check if user has opted out of emails
                if (!user || !user.email_notifications) {
                    resolve(false);
                    return;
                }

                // Create subject and message based on status
                let subject: string, message: string, color: string;
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
                let icsAttachment: string | null = null;
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
                            
                            <p>You can ${user.role === "guest" ? "register" : "log in"} to the system to view all your bookings and their statuses.</p>
                            <p>Best regards,<br>Scientific Infrastructure Team</p>
                            
                            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                                If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/preferences/user-manager/unsubscribe/${user.email}">unsubscribe</a>.
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

                await transporter.sendMail(mailOptions);
                resolve(true);
            } catch (error) {
                console.error('Error sending booking status update:', error);
                resolve(false);
            }
        });
        // Resolve the original promise immediately
        resolve(true);
    });
};

/**
 * Generate an ICS file for calendar invites
 * @param booking - Booking details
 * @param infrastructure - Infrastructure details
 * @param user - Optional user details for the summary
 * @returns ICS file content as string
 */
const generateICSFile = (
    booking: BookingEntry,
    infrastructure: Infrastructure,
    user: User | null = null
): string => {
    const cal = ical({ name: 'Scientific Infrastructure Booking' });

    // Parse date and times
    const bookingDate = new Date(booking.booking_date);
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);

    const startDate = new Date(bookingDate);
    startDate.setHours(startHour, startMinute, 0);

    const endDate = new Date(bookingDate);
    endDate.setHours(endHour, endMinute, 0);

    // Create a more descriptive summary if we have user info
    const summary = user
        ? `Pending Request: ${infrastructure.name} - ${user.name}`
        : `Booking: ${infrastructure.name}`;

    // Add event to calendar
    cal.createEvent({
        start: startDate,
        end: endDate,
        summary: summary,
        description: (booking.purpose || '') +
            (booking.status === 'pending' ? '\n\nStatus: Pending Approval' : ''),
        location: infrastructure.location || '',
        status: booking.status === 'approved' ? ICalEventStatus.CONFIRMED : ICalEventStatus.TENTATIVE,
    });

    return cal.toString();
};

/**
 * Generate a secure token for email actions
 * @param booking - The booking object
 * @param connection - Database connection (for transaction)
 * @returns The generated token or null on error
 */
const generateSecureActionToken = async (
    booking: BookingEntry,
    connection: any
): Promise<string | null> => {
    const token = generateToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 168); // 1 week (168-hours) expiry

    try {
        // Store token in database
        await connection.execute(
            'INSERT INTO email_action_tokens (token, booking_id, expires) VALUES (?, ?, ?)',
            [token, booking.id, expires]
        );
        return token;
    } catch (error) {
        console.error('Error generating secure action token:', error);
        return null;
    }
};

/**
 * Send guest booking verification email with a confirmation link
 * @param name - Guest name
 * @param email - Guest email
 * @param verificationUrl - The verification URL
 * @returns Nodemailer response
 */
const sendGuestBookingVerificationEmail = async (
    name: string,
    email: string,
    verificationUrl: string
): Promise<any> => {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Confirm Your Booking Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Confirm Your Booking</h2>
                <p>Hello ${name},</p>
                <p>Thank you for using our infrastructure booking system. Please click the button below to confirm your booking request:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Booking</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>This link will expire in 24 hours. If you did not request this booking, you can safely ignore this email.</p>
                <p>Best regards,<br>Scientific Infrastructure Team</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

export default {
    generateToken,
    sendVerificationEmail,
    sendPasswordResetEmail,
    verifyEmailConfig,
    sendBookingNotifications,
    sendBookingNotificationToManagers,
    sendBookingNotificationToUser,
    sendBookingStatusUpdate,
    generateSecureActionToken,
    sendGuestBookingVerificationEmail,
};