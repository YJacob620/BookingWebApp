const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, verifyAdmin, verifyInfrastructureManager, verifyInfrastructureAccess } = require('../middleware/authMiddleware');

// Get all questions for an infrastructure (admin or manager of this infrastructure)
router.get('/:infrastructureId/questions',
    authenticateToken,
    async (req, res) => {
        const { infrastructureId } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        try {
            // First, check if the infrastructure exists and get its status
            const [infrastructures] = await pool.execute(
                'SELECT * FROM infrastructures WHERE id = ?',
                [infrastructureId]
            );

            if (infrastructures.length === 0) {
                return res.status(404).json({ message: 'Infrastructure not found' });
            }

            const infrastructure = infrastructures[0];

            // Different access rules based on user role
            if (userRole === 'admin') {
                // Admins can access any infrastructure's questions
                // No additional checks needed
            } else if (userRole === 'infrastructure_manager') {
                // Managers can only access infrastructures assigned to them
                const [managerAccess] = await pool.execute(
                    'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                    [userId, infrastructureId]
                );

                if (managerAccess.length === 0) {
                    return res.status(403).json({
                        message: 'You do not have permission to access questions for this infrastructure'
                    });
                }
            } else {
                // Regular users (student, faculty, guest) can only see questions for active infrastructures
                // and only when they need to book
                if (!infrastructure.is_active) {
                    return res.status(403).json({
                        message: 'This infrastructure is currently inactive'
                    });
                }
            }

            // If we get here, the user has permission to view the questions
            const [rows] = await pool.execute(
                'SELECT * FROM infrastructure_questions WHERE infrastructure_id = ? ORDER BY display_order',
                [infrastructureId]
            );

            res.json(rows);
        } catch (error) {
            console.error('Error fetching questions:', error);
            res.status(500).json({ message: 'Error fetching questions' });
        }
    }
);

// Add a new question (admin or manager of this infrastructure)
router.post('/:infrastructureId/questions',
    authenticateToken,
    async (req, res) => {
        const { infrastructureId } = req.params;
        const { question_text, question_type, is_required, options, display_order } = req.body;

        // Check access permissions
        if (req.user.role !== 'admin') {
            try {
                const [access] = await pool.execute(
                    'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                    [req.user.userId, infrastructureId]
                );

                if (access.length === 0) {
                    return res.status(403).json({ message: 'You do not have permission to manage this infrastructure' });
                }
            } catch (error) {
                console.error('Error checking permissions:', error);
                return res.status(500).json({ message: 'Error checking permissions' });
            }
        }

        // Validate input
        if (!question_text || !question_type) {
            return res.status(400).json({ message: 'Question text and type are required' });
        }

        const validTypes = ['text', 'number', 'dropdown', 'document'];
        if (!validTypes.includes(question_type)) {
            return res.status(400).json({ message: 'Invalid question type' });
        }

        try {
            const [result] = await pool.execute(
                `INSERT INTO infrastructure_questions 
          (infrastructure_id, question_text, question_type, is_required, options, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    infrastructureId,
                    question_text,
                    question_type,
                    is_required ? 1 : 0,
                    question_type === 'dropdown' ? options : null,
                    display_order || 0
                ]
            );

            res.status(201).json({
                id: result.insertId,
                message: 'Question added successfully'
            });
        } catch (error) {
            console.error('Error adding question:', error);
            res.status(500).json({ message: 'Error adding question' });
        }
    }
);

// Update a question (admin or manager of this infrastructure)
router.put('/:infrastructureId/questions/:questionId',
    authenticateToken,
    async (req, res) => {
        const { infrastructureId, questionId } = req.params;
        const { question_text, question_type, is_required, options } = req.body;

        // Check access permissions (same as above)
        if (req.user.role !== 'admin') {
            try {
                const [access] = await pool.execute(
                    'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                    [req.user.userId, infrastructureId]
                );

                if (access.length === 0) {
                    return res.status(403).json({ message: 'You do not have permission to manage this infrastructure' });
                }
            } catch (error) {
                console.error('Error checking permissions:', error);
                return res.status(500).json({ message: 'Error checking permissions' });
            }
        }

        // Validation (similar to POST)
        if (!question_text || !question_type) {
            return res.status(400).json({ message: 'Question text and type are required' });
        }

        const validTypes = ['text', 'number', 'dropdown', 'document'];
        if (!validTypes.includes(question_type)) {
            return res.status(400).json({ message: 'Invalid question type' });
        }

        try {
            const [result] = await pool.execute(
                `UPDATE infrastructure_questions
         SET question_text = ?, question_type = ?, is_required = ?, options = ?
         WHERE id = ? AND infrastructure_id = ?`,
                [
                    question_text,
                    question_type,
                    is_required ? 1 : 0,
                    question_type === 'dropdown' ? options : null,
                    questionId,
                    infrastructureId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Question not found' });
            }

            res.json({ message: 'Question updated successfully' });
        } catch (error) {
            console.error('Error updating question:', error);
            res.status(500).json({ message: 'Error updating question' });
        }
    }
);

// Delete a question (admin or manager of this infrastructure)
router.delete('/:infrastructureId/questions/:questionId',
    authenticateToken,
    async (req, res) => {
        const { infrastructureId, questionId } = req.params;

        // Check access permissions (same as above)
        if (req.user.role !== 'admin') {
            try {
                const [access] = await pool.execute(
                    'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                    [req.user.userId, infrastructureId]
                );

                if (access.length === 0) {
                    return res.status(403).json({ message: 'You do not have permission to manage this infrastructure' });
                }
            } catch (error) {
                console.error('Error checking permissions:', error);
                return res.status(500).json({ message: 'Error checking permissions' });
            }
        }

        try {
            const [result] = await pool.execute(
                'DELETE FROM infrastructure_questions WHERE id = ? AND infrastructure_id = ?',
                [questionId, infrastructureId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Question not found' });
            }

            res.json({ message: 'Question deleted successfully' });
        } catch (error) {
            console.error('Error deleting question:', error);
            res.status(500).json({ message: 'Error deleting question' });
        }
    }
);

// Update question order (admin or manager of this infrastructure)
router.put('/:infrastructureId/questions/reorder',
    authenticateToken,
    async (req, res) => {
        const { infrastructureId } = req.params;
        const { questions } = req.body;

        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: 'Invalid questions data' });
        }

        // Check access permissions (same as above)
        if (req.user.role !== 'admin') {
            try {
                const [access] = await pool.execute(
                    'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                    [req.user.userId, infrastructureId]
                );

                if (access.length === 0) {
                    return res.status(403).json({ message: 'You do not have permission to manage this infrastructure' });
                }
            } catch (error) {
                console.error('Error checking permissions:', error);
                return res.status(500).json({ message: 'Error checking permissions' });
            }
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update each question's display_order
            for (const question of questions) {
                await connection.execute(
                    'UPDATE infrastructure_questions SET display_order = ? WHERE id = ? AND infrastructure_id = ?',
                    [question.display_order, question.id, infrastructureId]
                );
            }

            await connection.commit();
            res.json({ message: 'Question order updated successfully' });
        } catch (error) {
            await connection.rollback();
            console.error('Error updating question order:', error);
            res.status(500).json({ message: 'Error updating question order' });
        } finally {
            connection.release();
        }
    }
);

module.exports = router;