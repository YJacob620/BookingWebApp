import nodemailer from 'nodemailer';
import ical, { ICalEventStatus } from 'ical-generator';
import { RowDataPacket } from 'mysql2';
import pool from '../configuration/db';
import fs from 'fs';
import path from 'path';
import {
    User,
    BookingEntry,
    Infrastructure,
    generateToken,
    findUserByIdOrEmail
} from './'


// Define interface for booking answers
interface BookingAnswer extends RowDataPacket {
    question_id: number;
    question_text: string;
    question_type: 'dropdown' | 'text' | 'number' | 'document';
    answer_text: string | null;
    document_path?: string;
    document_url?: string;
}

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
        const filterQuestionAnswers = await fetchBookingAnswers(booking.id);

        // Prepare file attachments
        const fileAttachments = prepareFileAttachments(filterQuestionAnswers);

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
                    
                    ${formatBookingAnswersHTML(filterQuestionAnswers)}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">Approve Request</a>
                        <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reject Request</a>
                    </div>
                    
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
                    },
                    ...fileAttachments
                ]
            };

            const mailOptions_he = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
                to: manager.email,
                subject: `הזמנה תור חדשה ל- ${infrastructure.name}\u200F`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" dir="rtl">
                    <h2 style="color: #333;">הזמנה חדשה</h2>
                    <p>שלום, ${manager.name || 'מנהל התשתית'}</p>
                    <p>בקשת הזמנה חדשה הוגשה עבור <strong>${infrastructure.name}</strong>.</p>
                    
                    <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                        <p><strong>User:</strong> ${user.name} (${user.email})</p>
                        <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                        <p><strong>Purpose:</strong> ${booking.purpose || 'N/A'}</p>
                    </div>
                    
                    ${formatBookingAnswersHTML(filterQuestionAnswers)}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">Approve Request</a>
                        <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reject Request</a>
                    </div>
                    
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
                    },
                    ...fileAttachments
                ]
            };

            return transporter.sendMail(mailOptions);
        }));
    } catch (error) {
        console.error('Error sending email to managers:', error);
    }
};

/**
 * Fetch booking answers with question details. This function should wrapped in a try-catch block.
 * @param bookingId - ID of the booking
 * @param connection - Optional database connection for transactions
 * @returns Array of booking answers with question details
 */
const fetchBookingAnswers = async (bookingId: number, connection = pool): Promise<BookingAnswer[]> => {
    const [answers] = await connection.execute<BookingAnswer[]>(
        `SELECT 
                a.question_id,
                q.question_text,
                q.question_type,
                a.answer_text,
                a.document_path
            FROM booking_answers a
            JOIN infrastructure_questions q ON a.question_id = q.id
            WHERE a.booking_id = ?
            ORDER BY q.display_order`,
        [bookingId]
    );

    // Add document_url for file uploads
    return answers.map(answer => {
        if (answer.document_path) {
            answer.document_url = `/bookings/download-file/${bookingId}/${answer.question_id}`;
        }
        return answer;
    });
};

/**
 * Format booking answers for email display (for infrastructure managers)
 */
const formatBookingAnswersHTML = (answers: BookingAnswer[]): string => {
    if (!answers || answers.length === 0) {
        return '<p><em>No additional information provided.</em></p>';
    }

    let html = '<div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">';
    html += '<h3 style="color: #333;">Additional Information</h3>';

    answers.forEach(answer => {
        html += `<div style="margin-bottom: 15px;">`;
        html += `<p style="font-weight: bold; margin-bottom: 5px;">${answer.question_text}</p>`;

        if (answer.question_type === 'document' && answer.document_path) {
            // For file uploads, mention that the file is attached
            html += `<p>File uploaded: ${answer.answer_text || 'Unnamed file'}</p>`;
            html += `<p style="font-size: 12px; color: #666;">The file has been attached to this email for your convenience.</p>`;
        } else {
            // For text answers
            html += `<p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${answer.answer_text || 'No answer provided'}</p>`;
        }

        html += `</div>`;
    });

    html += '</div>';
    return html;
};

/**
 * Prepare file attachments for email
 * @param answers - Array of booking answers with document paths
 * @returns Array of attachment objects for nodemailer
 */
const prepareFileAttachments = (answers: BookingAnswer[]): any[] => {
    const attachments: any[] = [];

    answers.forEach(answer => {
        if (answer.question_type === 'document' && answer.document_path && fs.existsSync(answer.document_path)) {
            try {
                const filename = answer.answer_text || path.basename(answer.document_path);
                const content = fs.readFileSync(answer.document_path);

                // Determine content type based on file extension
                const ext = path.extname(answer.document_path).toLowerCase();
                let contentType = 'application/octet-stream'; // Default

                // Map common extensions to MIME types
                const mimeTypes: Record<string, string> = {
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.xls': 'application/vnd.ms-excel',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.txt': 'text/plain',
                    '.csv': 'text/csv'
                };

                if (mimeTypes[ext]) {
                    contentType = mimeTypes[ext];
                }

                attachments.push({
                    filename,
                    content,
                    contentType
                });
            } catch (error) {
                console.error(`Error reading file attachment ${answer.document_path}:`, error);
                // Continue with other attachments even if one fails
            }
        }
    });

    return attachments;
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

        const mailOptions_he = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: `בקשה להזמנת תור ל- ${infrastructure.name} התקבלה\u200F`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" dir = "rtl">
                <h2 style="color: #333;">הזמנת תור התקבלה</h2>
                <p>שלום, ${user.name}</p>
                <p>קיבלנו את הזמנתך ל- <strong>${infrastructure.name}</strong></p>
                
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <p><strong>תאריך:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>בשעות:</strong> ${booking.start_time} - ${booking.end_time}</p>
                    <p><strong>מטרה:</strong> ${booking.purpose || 'N/A'}</p>
                    <p><strong>סטטוס:</strong> <span style="color: #FF9800;">ממתין</span></p>
                </div>
                
                <p>מנהל התשתית יבחן את בקשתך בקרוב. תקבל/י אימייל נוסף כאשר בקשתך תאושר או תידחה.</p>
                <p>בברכה, <br>צוות מנהל טכנולוגיות והנדסה</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    אם אינך מעוניין/ת לקבל הודעות דוא"ל אלה יותר, באפשרותך לבטל את  <a href="${process.env.FRONTEND_URL}/preferences/user-manager/unsubscribe/${user.email}">הרישום</a>.
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
                let subject: string, message: string, color: string, subject_he: string, message_he: string
                switch (status) {
                    case 'approved':
                        subject = `Your Booking Request for ${infrastructure.name} was Approved`;
                        message = 'Your booking request has been approved.';
                        color = '#4CAF50';
                        subject_he = 'בקשת ההזמנה שלך עבור ${infrastructure.name} אושרה\u200F';
                        message_he = 'בקשת ההזמנה שלך אושרה';
                        break;
                    case 'rejected':
                        subject = `Your Booking Request for ${infrastructure.name} was Rejected`;
                        message = 'Unfortunately, your booking request has been rejected.';
                        color = '#f44336';
                        subject_he = 'בקשת ההזמנה שלך עבור ${infrastructure.name} נדחתה\u200F';
                        message_he = 'למרבה הצער, בקשת ההזמנה שלך נדחתה';
                        break;
                    case 'canceled':
                        subject = `Your Booking for ${infrastructure.name} was Canceled`;
                        message = 'Your booking has been canceled by an administrator.';
                        color = '#ff9800';
                        subject_he = ' ההזמנה שלך עבור ${infrastructure.name} בוטלה\u200F';
                        message_he = 'ההזמנה שלך בוטלה ע"י מנהל מערכת';
                        break;
                    default:
                        subject = `Booking Status Update for ${infrastructure.name}`;
                        message = `The status of your booking has been updated to: ${status}.`;
                        color = '#2196F3';
                        subject_he = 'עדכון סטטוס הזמנה עבור ${infrastructure.name}\u200F';
                        message_he = 'סטטוס ההזמנה שלך עודכו להיות: ${status}\u200F';
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

                const mailOptions_he = {
                    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
                    to: user.email,
                    subject: subject_he,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" dir="rtl">
                            <h2 style="color: ${color};">עדכון סטטוס ההזמנה</h2>
                            <p>שלום, ${user.name}</p>
                            <p>${message_he}</p>
                            
                            <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                                <p><strong>תאריך:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                                <p><strong>בשעות:</strong> ${booking.start_time} - ${booking.end_time}</p>
                                <p><strong>מטרה:</strong> ${booking.purpose || 'N/A'}</p>
                                <p><strong>סטטוס:</strong> <span style="color: #FF9800;">ממתין</span></p>
                            </div>
                            
                            ${status === 'approved' ? `
                            <p>הזמנה ליומן צורפה לאימייל זה. באפשרותך להוסיף אותה ליישום היומן שלך.</p>
                            ` : ''}
                            
                            <p>אתה יכול ${user.role === "guest" ? "להירשם" : "להיכנס"} למערכת כדי לראות את כל ההזמנות שלך והסטטוס שלהם.</p>
                            <p>בברכה, <br>צוות מנהל טכנולוגיות והנדסה</p>
                            
                            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                                אם אינך מעוניין/ת לקבל הודעות דוא"ל אלה יותר, באפשרותך לבטל את  <a href="${process.env.FRONTEND_URL}/preferences/user-manager/unsubscribe/${user.email}">הרישום</a>.
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

    const summary_he = user
        ? `\u202Bממתין לבקשה: ${infrastructure.name} - ${user.name}\u202C`
        : `\u202Bהזמנה: ${infrastructure.name}\u202C`;

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