/* Router functions regarding infrastructures for both admins and infrastructure managers */

import express, { Request, Response } from 'express';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
const router = express.Router();
const pool: Pool = require('../config/db');
const { authenticateAdminOrManager, hasInfrastructureAccess } = require('../middleware/authMiddleware');

// Define types
interface InfrastructureQuestion {
    id?: number;
    infrastructure_id: number;
    question_text: string;
    question_type: 'text' | 'number' | 'dropdown' | 'document';
    is_required: boolean | number;
    options: string | null;
    display_order: number;
}

interface QuestionReorderItem {
    id: number;
    display_order: number;
}

// Get all questions for an infrastructure (admin or manager of this infrastructure)
router.get('/:infrastructureId/questions', authenticateAdminOrManager, async (req: Request, res: Response) => {
    const infrastructureId = parseInt(req.params.infrastructureId, 10);

    try {
        // Check if the user has access to this infrastructure
        if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

        // If we get here, the user has permission to view the questions
        const [rows] = await pool.execute < RowDataPacket[] > (
            'SELECT * FROM infrastructure_questions WHERE infrastructure_id = ? ORDER BY display_order',
            [infrastructureId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ message: 'Error fetching questions' });
    }
});

// Add a new question (admin or manager of this infrastructure)
router.post('/:infrastructureId/questions', authenticateAdminOrManager, async (req: Request, res: Response) => {
    const infrastructureId = parseInt(req.params.infrastructureId, 10);
    const { question_text, question_type, is_required, options, display_order } = req.body as InfrastructureQuestion;

    // Check if the user has access to this infrastructure
    if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

    // Validate input
    if (!question_text || !question_type) {
        return res.status(400).json({ message: 'Question text and type are required' });
    }

    const validTypes = ['text', 'number', 'dropdown', 'document'];
    if (!validTypes.includes(question_type)) {
        return res.status(400).json({ message: 'Invalid question type' });
    }

    try {
        const [result] = await pool.execute < ResultSetHeader > (
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
});

// Update a question (admin or manager of this infrastructure)
router.put('/:infrastructureId/questions/:questionId', authenticateAdminOrManager, async (req: Request, res: Response) => {
    const infrastructureId = parseInt(req.params.infrastructureId, 10);
    const questionId = parseInt(req.params.questionId, 10);
    const { question_text, question_type, is_required, options } = req.body as InfrastructureQuestion;

    // Check if the user has access to this infrastructure
    if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

    // Validation
    if (!question_text || !question_type) {
        return res.status(400).json({ message: 'Question text and type are required' });
    }

    const validTypes = ['text', 'number', 'dropdown', 'document'];
    if (!validTypes.includes(question_type)) {
        return res.status(400).json({ message: 'Invalid question type' });
    }

    try {
        const [result] = await pool.execute < ResultSetHeader > (
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
});

// Delete a question (admin or manager of this infrastructure)
router.delete('/:infrastructureId/questions/:questionId',
    authenticateAdminOrManager,
    async (req: Request, res: Response) => {
        const infrastructureId = parseInt(req.params.infrastructureId, 10);
        const questionId = parseInt(req.params.questionId, 10);

        // Check if the user has access to this infrastructure
        if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

        try {
            const [result] = await pool.execute < ResultSetHeader > (
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
    authenticateAdminOrManager,
    async (req: Request, res: Response) => {
        const infrastructureId = parseInt(req.params.infrastructureId, 10);
        const { questions } = req.body as { questions: QuestionReorderItem[] };

        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: 'Invalid questions data' });
        }

        // Check if the user has access to this infrastructure
        if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

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

export default router;