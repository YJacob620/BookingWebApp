const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Get current user's email notification preferences
 */
router.get('/email', authenticateToken, async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.userId;

    // Query the database for the user's preferences
    const [rows] = await pool.execute(
      'SELECT email_notifications FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return the email notification preference
    res.json({
      success: true,
      email_notifications: !!rows[0].email_notifications
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email preferences'
    });
  }
});

/**
 * Update user's email notification preferences
 */
router.put('/email', authenticateToken, async (req, res) => {
  const { email_notifications } = req.body;

  // Validate input
  if (typeof email_notifications !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Invalid email_notifications value. Expected boolean.'
    });
  }

  try {
    // Get user ID from JWT token
    const userId = req.user.userId;

    // Update the database
    const [result] = await pool.execute(
      'UPDATE users SET email_notifications = ? WHERE id = ?',
      [email_notifications ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return success response
    res.json({
      success: true,
      message: 'Email preferences updated successfully',
      email_notifications
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating email preferences'
    });
  }
});

/**
 * Public unsubscribe route (no authentication required)
 * This allows users to unsubscribe via a link in an email
 */
router.get('/unsubscribe/:email', async (req, res) => {
  const { email } = req.params;

  try {
    // Update the user's preferences to disable emails
    const [result] = await pool.execute(
      'UPDATE users SET email_notifications = 0 WHERE email = ?',
      [email]
    );

    if (result.affectedRows === 0) {
      // Don't indicate if email was found for security
      return res.status(200).send(`
        <html>
          <head>
            <title>Unsubscribe Request Processed</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; line-height: 1.6; }
              h1 { color: #333; }
              .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
              .button { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Unsubscribe Request Processed</h1>
              <p>If the provided email address exists in our system, it has been unsubscribed from all notifications.</p>
              <p>If you continue to receive emails, please contact support or log in to your account to manage your preferences.</p>
              <p><a href="${process.env.FRONTEND_URL}" class="button">Return to Website</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Send success response with HTML page
    res.status(200).send(`
      <html>
        <head>
          <title>Successfully Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #333; }
            .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            .success { color: #4CAF50; }
            .button { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from all notifications from the Scientific Infrastructure Booking System.</p>
            <p>You can re-enable email notifications at any time by logging into your account and updating your preferences.</p>
            <p><a href="${process.env.FRONTEND_URL}" class="button">Return to Website</a></p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Error Processing Request</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #d32f2f; }
            .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            .button { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error Processing Request</h1>
            <p>We encountered an error while processing your unsubscribe request.</p>
            <p>Please try again later or log in to your account to manage your email preferences.</p>
            <p><a href="${process.env.FRONTEND_URL}" class="button">Return to Website</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

module.exports = router;