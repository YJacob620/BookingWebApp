import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import pool from '../configuration/db';
import { findUserByIdOrEmail } from '../utils';
const router = express.Router();


/**
 * Get current user's email notification preferences
 */
router.get('/email', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: number = req.user!.userId;
    const user = await findUserByIdOrEmail({ id: userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      email_notifications: user.email_notifications > 0 // 'convert' from TINYINT to boolean
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
router.put('/email', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { email_notifications }: { email_notifications: boolean } = req.body;

  if (typeof email_notifications !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'Invalid email_notifications value. Expected boolean.'
    });
    return;
  }

  try {
    const userId: number = req.user!.userId;

    const [result]: any = await pool.execute(
      'UPDATE users SET email_notifications = ? WHERE id = ?',
      [email_notifications ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

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
router.get('/unsubscribe/:email', async (req: Request<{ email: string }>, res: Response): Promise<void> => {
  const { email }: { email: string } = req.params;

  try {
    const [result]: any = await pool.execute(
      'UPDATE users SET email_notifications = 0 WHERE email = ?',
      [email]
    );


    if (result.affectedRows === 0) {
      res.status(200).send(`
       <html>
         <head>
           <title>Unsubscribe Request Processed</title>
           <style>
             body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; line-height: 1.6; }
             h1 { color: #333; }
             .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
             .button { display:inline-block;background:#0066cc;color:white;padding:
            10px 
            20px;text-decoration:none;border-radius:
            4px;}
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
       </html>`
      );
      return;
    }

    res.status(200).send(`
     <html>
       <head>
         <title>Successfully Unsubscribed</title>
         <style>
           body{font-family:
           Arial,sans-serif;max-width:
          600px;margin:
          20px auto;padding:
          20px;line-height:
          1.6;}h1{color:#333;}.container{border:
           	1px solid #ddd;padding:
           	20px;border-radius:
           	5px;} .success{color:#4CAF50;} .button{display:inline-block;background:#0066cc;color:white;padding:
           	10px 
           	20px;text-decoration:none;border-radius:
           	4px;}
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
     </html>`
    );
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    res.status(500).send(`
     <html><head><title>Error Processing Request</title><style>body{font-family:Ariel,sans-serif;margin:auto;width:max-content;}h2{color:red}</style></head><body><h2>Error Processing Request</h2><br/><span>We encountered an error while processing your unsubscribe request.<br/>Please try again later or log in to your account to manage your Email Preferences.<br/></span></body></html>`
    );
  }
});

export default router;