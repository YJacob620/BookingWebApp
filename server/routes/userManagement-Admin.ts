import express, { Request, Response } from 'express';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
const router = express.Router();
import pool from '../configuration/db';
import { authenticateAdmin } from '../middleware/authMiddleware';

interface User extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    role: string;
    is_verified: boolean;
    is_blacklisted: boolean;
    created_at: Date;
    updated_at: Date;
}

interface Infrastructure extends RowDataPacket {
    id: number;
    name: string;
    // Add other infrastructure properties as needed
}

// Get all users (admin only)
router.get('/users', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute<User[]>(
            `SELECT 
                id, name, email, role, is_verified, is_blacklisted,
                created_at, updated_at
             FROM users
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Update user role (admin only)
router.put('/users/:id/role', authenticateAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
        res.status(400).json({ message: 'Role is required' });
        return;
    }

    const validRoles: string[] = ['admin', 'manager', 'faculty', 'student', 'guest'];
    if (!validRoles.includes(role)) {
        res.status(400).json({ message: 'Invalid role' });
        return;
    }

    try {
        // Check if user exists
        const [users] = await pool.execute<User[]>('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const user = users[0];

        // Update role
        await pool.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, id]
        );

        // If changing to/from infrastructure_manager, handle the manager-infrastructure relationship
        if (user.role === 'manager' && role !== 'manager') {
            // User is no longer a manager, remove all their infrastructure assignments
            await pool.execute(
                'DELETE FROM infrastructure_managers WHERE user_id = ?',
                [id]
            );
        }

        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Error updating user role' });
    }
});

// Update user blacklist status (admin only)
router.put('/users/:id/blacklist', authenticateAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { blacklist } = req.body;

    if (typeof blacklist !== 'boolean') {
        res.status(400).json({ message: 'Blacklist status must be a boolean' });
        return;
    }

    try {
        // Check if user exists
        const [users] = await pool.execute<User[]>('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Update blacklist status
        await pool.execute(
            'UPDATE users SET is_blacklisted = ? WHERE id = ?',
            [blacklist ? 1 : 0, id]
        );

        res.json({ message: 'User blacklist status updated successfully' });
    } catch (error) {
        console.error('Error updating user blacklist status:', error);
        res.status(500).json({ message: 'Error updating user blacklist status' });
    }
});

// Get infrastructures assigned to a manager (admin only)
router.get('/users/:id/infrastructures', authenticateAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute<Infrastructure[]>(
            `SELECT i.* 
             FROM infrastructures i
             JOIN infrastructure_managers im ON i.id = im.infrastructure_id
             WHERE im.user_id = ?
             ORDER BY i.name`,
            [id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching manager infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

// Assign infrastructure to a manager (admin only)
router.post('/users/:id/infrastructures', authenticateAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { infrastructureId } = req.body;

    if (!infrastructureId) {
        res.status(400).json({ message: 'Infrastructure ID is required' });
        return;
    }

    try {
        // Check if user exists and is a manager
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE id = ? AND role = "infrastructure_manager"',
            [id]
        );

        if (users.length === 0) {
            res.status(404).json({ message: 'User not found or not an infrastructure manager' });
            return;
        }

        // Check if infrastructure exists
        const [infrastructures] = await pool.execute<Infrastructure[]>(
            'SELECT * FROM infrastructures WHERE id = ?',
            [infrastructureId]
        );

        if (infrastructures.length === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
            return;
        }

        // Check if assignment already exists
        const [existing] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [id, infrastructureId]
        );

        if (existing.length > 0) {
            res.status(409).json({ message: 'Infrastructure already assigned to this manager' });
            return;
        }

        // Create assignment
        await pool.execute(
            'INSERT INTO infrastructure_managers (user_id, infrastructure_id) VALUES (?, ?)',
            [id, infrastructureId]
        );

        res.status(201).json({ message: 'Infrastructure assigned successfully' });
    } catch (error) {
        console.error('Error assigning infrastructure:', error);
        res.status(500).json({ message: 'Error assigning infrastructure' });
    }
});

// Remove infrastructure from a manager (admin only)
router.delete('/users/:id/infrastructures/:infrastructureId', authenticateAdmin, async (req: Request, res: Response) => {
    const { id, infrastructureId } = req.params;

    try {
        // Delete the assignment
        const [result] = await pool.execute<ResultSetHeader>(
            'DELETE FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [id, infrastructureId]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }

        res.json({ message: 'Infrastructure removed from manager successfully' });
    } catch (error) {
        console.error('Error removing infrastructure:', error);
        res.status(500).json({ message: 'Error removing infrastructure' });
    }
});

export default router;