import express, { Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/authMiddleware';

const router = express.Router();
import pool from '../configuration/db';

// Get all infrastructures (admin only)
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows]: [any[], any] = await pool.execute(
            'SELECT * FROM infrastructures ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

// Create infrastructure (admin only)
router.post('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
    const { name, description, location, is_active }: { name: string; description: string; location?: string | null; is_active?: boolean } = req.body;

    // Validate required fields
    if (!name || !description) {
        res.status(400).json({ message: 'Name and description are required' });
        return;
    }

    try {
        const [result]: [any, any] = await pool.execute(
            `INSERT INTO infrastructures (name, description, location, is_active)
             VALUES (?, ?, ?, ?)`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0
            ]
        );

        if (result.affectedRows === 1) {
            res.status(201).json({
                message: 'Infrastructure created successfully',
                id: result.insertId
            });
        } else {
            res.status(500).json({ message: 'Failed to create infrastructure' });
        }
    } catch (error) {
        console.error('Error creating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error creating infrastructure' });
        }
    }
});

// Toggle infrastructure status (admin only)
router.post('/:id/toggle-status', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        // First check if the infrastructure exists
        const [rows]: [any[], any] = await pool.execute(
            'SELECT is_active FROM infrastructures WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
            return;
        }

        const [result]: [any, any] = await pool.execute(
            'UPDATE infrastructures SET is_active = NOT is_active WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 1) {
            res.json({ message: 'Status updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update status' });
        }
    } catch (error) {
        console.error('Error toggling infrastructure status:', error);
        res.status(500).json({ message: 'Error updating infrastructure status' });
    }
});

// Edit infrastructure (admin only)
router.put('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, location, is_active }:
        { name: string; description: string; location?: string | null; is_active?: boolean } = req.body;

    // Validate required fields
    if (!name || !description) {
        res.status(400).json({ message: 'Name and description are required' });
        return;
    }

    try {
        const [result]: [any, any] = await pool.execute(
            `UPDATE infrastructures 
           SET name=?,description=?,location=?, 
           is_active=?
           WHERE id=?`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0,
                id
            ]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
        } else {
            res.json({ message: 'Infrastructure updated successfully' });
        }
    } catch (error) {
        console.error('Error updating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error updating infrastructure' });
        }
    }
});

export default router;