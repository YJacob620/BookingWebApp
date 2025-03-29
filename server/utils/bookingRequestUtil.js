const path = require('path');

/**
 * Process a booking request for either a logged-in user or a guest
 * 
 * @param {Object} connection - Database connection with transaction already begun
 * @param {Object} params - Booking parameters
 * @param {string} params.email - User/guest email
 * @param {number} params.timeslotId - ID of the timeslot to book
 * @param {string} params.purpose - Purpose of booking (optional)
 * @param {Object} params.answers - Answers to infrastructure questions (optional)
 * @param {boolean} params.skipAnswerValidation - Whether to skip answer validation (e.g., for guest flow where answers are already validated)
 * @returns {Promise<Object>} - Booking result with success status and related data
 */
const processBookingRequest = async (connection, params) => {
    const { email, timeslotId, purpose = '', answers = {}, skipAnswerValidation = false } = params;

    try {
        // Check if the timeslot exists and is available
        const [timeslots] = await connection.execute(
            `SELECT * FROM bookings 
             WHERE id = ? 
             AND booking_type = 'timeslot' 
             AND status = 'available'`,
            [timeslotId]
        );

        if (timeslots.length === 0) {
            return {
                success: false,
                message: 'Timeslot not found or not available'
            };
        }

        const timeslot = timeslots[0];
        const infrastructure_id = timeslot.infrastructure_id;

        // Validate required questions (unless skipped)
        if (!skipAnswerValidation) {
            // Fetch required questions
            const [requiredQuestions] = await connection.execute(
                `SELECT id FROM infrastructure_questions WHERE infrastructure_id = ? AND is_required = 1`,
                [infrastructure_id]
            );

            // Check for missing answers
            if (requiredQuestions.length > 0) {
                const requiredQuestionIds = requiredQuestions.map(q => q.id);
                const missingAnswers = [];

                for (const qId of requiredQuestionIds) {
                    const answer = answers[qId];
                    const isEmpty = !answer ||
                        (answer.type === 'text' && (!answer.value || answer.value.trim() === '')) ||
                        (answer.type === 'file' && !answer.filePath);

                    if (isEmpty) {
                        missingAnswers.push(qId);
                    }
                }

                if (missingAnswers.length > 0) {
                    return {
                        success: false,
                        message: 'All required questions must be answered',
                        missingAnswers
                    };
                }
            }
        }

        // Book the timeslot
        await connection.execute(
            `UPDATE bookings
             SET booking_type = 'booking',
                 user_email = ?,
                 status = 'pending',
                 purpose = ?
             WHERE id = ?`,
            [email, purpose, timeslotId]
        );

        // Get the updated booking
        const [bookings] = await connection.execute(
            `SELECT * FROM bookings WHERE id = ?`,
            [timeslotId]
        );
        const booking = bookings[0];

        // Process answers if provided
        if (Object.keys(answers).length > 0) {
            for (const [questionId, answerData] of Object.entries(answers)) {
                let answerText = null;
                let documentPath = null;

                if (typeof answerData === 'string') {
                    // Simple string answer
                    answerText = answerData;
                } else if (answerData && typeof answerData === 'object') {
                    if (answerData.type === 'file' && answerData.filePath) {
                        // File answer
                        documentPath = answerData.filePath;
                        answerText = answerData.originalName || 'Uploaded file';
                    } else if (answerData.type === 'text' && answerData.value) {
                        // Text answer with value property
                        answerText = answerData.value;
                    } else if (answerData.value !== undefined) {
                        // Direct value property
                        answerText = String(answerData.value);
                    }
                }

                // Save answer only if we have something to save
                if (answerText !== null || documentPath !== null) {
                    // For file uploads, store the filename in answer_text
                    const finalAnswerText = documentPath && answerData.originalName
                        ? path.basename(answerData.originalName)
                        : answerText;

                    await connection.execute(
                        `INSERT INTO booking_answers 
                         (booking_id, question_id, answer_text, document_path) 
                         VALUES (?, ?, ?, ?)`,
                        [timeslotId, questionId, finalAnswerText, documentPath]
                    );
                }
            }
        }

        // Get infrastructure details
        const [infrastructures] = await connection.execute(
            'SELECT * FROM infrastructures WHERE id = ?',
            [timeslot.infrastructure_id]
        );

        // Get infrastructure managers
        const [managers] = await connection.execute(
            `SELECT u.id, u.name, u.email, u.email_notifications
             FROM users u
             JOIN infrastructure_managers im ON u.id = im.user_id
             WHERE im.infrastructure_id = ?`,
            [timeslot.infrastructure_id]
        );

        return {
            success: true,
            booking,
            infrastructure: infrastructures.length > 0 ? infrastructures[0] : null,
            managers
        };
    } catch (error) {
        // Log the error but let the caller handle the transaction rollback
        console.error('Error in processBookingRequest:', error);
        throw error;
    }
};

module.exports = {
    processBookingRequest
};