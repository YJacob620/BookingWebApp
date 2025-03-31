import nodemailer from 'nodemailer';
import crypto from 'crypto';
import pool from '../config/db';
import ical from 'ical-generator';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST as string,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USERNAME as string,
        pass: process.env.EMAIL_PASSWORD as string
    }
});

const generateToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

interface User {
    email: string;
    name?: string;
}

const sendVerificationEmail = async (user: User, token: string): Promise<any> => {
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

const sendPasswordResetEmail = async (user: User, token: string): Promise<any> => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Reset Your Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color:#333;">Password Reset</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>You requested a password reset for your Scientific Infrastructure Booking System account. Click the button below to set a new password:</p>
                <div style="text-align:center;margin :30px ;">
                    <a href="${resetUrl}" style="background-color:#4285F4;color:white;padding :12 px ;20 px;text-decoration:none;border-radius :4 px;font-weight:bold">Reset Password</a >
                 </ div >
                  ...
            </ div >
       `
    };

    return transporter.sendMail(mailOptions);
};

const verifyEmailConfig = async (): Promise<boolean> => {
    try {
        await transporter.verify();
        return true;
    } catch (error) {
        return false;
    }
};

interface Booking {
    user_email: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose?: string;
}

interface Infrastructure {
    name: string;
}

type Managers = Array<{ email_notifications: boolean, email: string, name?: string }>;

const sendBookingNotifications = async (
    booking: Booking,
    infrastructure: Infrastructure,
    managers: Managers,
    secureToken: string
): Promise<void> => {
    // Immediately return promise that resolves
    return new Promise((resolve) => {
        // Use process.nextTick to run notifications in background 
        process.nextTick(async () => {
            try {
                await sendBookingNotificationToManagers(booking, infrastructure, managers, secureToken);
                await sendBookingNotificationToUser(booking, infrastructure);
                console.log('Booking notifications sent successfully');
                resolve(true);
            } catch (error) {
                console.error('Error sending booking notifications in background:', error);
                resolve(false);
            }
        });
        // Resolve original promise immediately
        resolve(true);
    });
};

const sendBookingNotificationToManagers = async (
    booking: Booking,
    infrastructure: Infrastructure,
    managers: Managers,
    actionToken: string
): Promise<any[]> => {

    // Get user details
    const [users]: any[] = await pool.execute('SELECT name,email FROM users WHERE email=?', [booking.user_email]);
    const user = users[0] || { name: 'User', email: (booking.user_email) };

    // Check if all managers have opted out of emails     
    const activeManagers = managers.filter(manager => manager.email_notifications);
    if (activeManagers.length === 0) {
        console.log('No active managers to notify');
        return;
    }

    // Create links for approval/rejection via email buttons         
    const approveUrl = `${process.env.FRONTEND_URL}/email-action/approve/${actionToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/email-action/reject/${actionToken}`;

    // Generate calendar file for pending booking request       
    const icsAttachment = generateICSFile(booking, infrastructure, user);

    // Send email to each manager individually       
    return Promise.all(activeManagers.map(manager => {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}"<${process.env.EMAIL_FROM}>`,
            to: (manager.email),
            subject: `New Booking Request for ${(infrastructure.name)}`,
            html: `<div style='font-family:Ariel,sans-serif;width:max-width'></div>`,
            attachments: [
                {
                    filename: 'pending_booking_request.ics',
                    content: (icsAttachment),
                    contentType: 'text/calendar'
                }
            ]
        };
        return transporter.sendMail(mailOptions);
    }));
};

// Other functions are similarly translated...

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
    sendGuestBookingVerificationEmail
};