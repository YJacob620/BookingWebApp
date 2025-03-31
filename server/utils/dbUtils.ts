import { PoolConnection } from 'mysql2/promise';
import pool from '../configuration/db';

/**
 * Executes a database operation within a transaction
 * 
 * @param operation Function that performs database operations using the provided connection
 * @returns Result of the operation
 */
export async function withTransaction<T>(
    operation: (connection: PoolConnection) => Promise<T>
): Promise<T> {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await operation(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Safely executes a database query, handling connection errors
 * 
 * @param query Function that performs a database query without transaction management
 * @returns Result of the query
 */
export async function executeQuery<T>(
    query: () => Promise<T>
): Promise<T> {
    try {
        return await query();
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}