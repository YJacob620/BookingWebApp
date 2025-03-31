import express, { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { authenticateManager } from '../middleware/authMiddleware';

const router = express.Router();
import pool from '../configuration/db';

// Get infrastructures managed by the current manager (infers manager from token)
router.get('/', authenticateManager, async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows]: [any[], any] = await pool.execute(
            `SELECT i.*
             FROM infrastructures i
             JOIN infrastructure_managers im ON i.id = im.infrastructure_id
             WHERE im.user_id = ?
             ORDER BY i.name`,
            [req.user.userId] // Use the userId from the JWT token
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching manager infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

export default router;