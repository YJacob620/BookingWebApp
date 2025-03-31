import mysql, { Pool } from 'mysql2/promise';

const pool: Pool = mysql.createPool({
    host: process.env.DB_HOST as string,
    port: parseInt(process.env.DB_PORT as string, 10),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASS as string,
    database: process.env.DB_NAME as string,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
    charset: 'utf8mb4'
});

export default pool;