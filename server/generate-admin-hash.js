const argon2 = require('argon2');

async function generateHash(password) {
    try {
        const hash = await argon2.hash(password);
        console.log('Your hashed password is:\n', hash);

        // Also generate the SQL insert statement
        console.log('\nYour SQL insert statement:\n');
        console.log(`INSERT INTO users (email, password_hash, name, role) VALUES (
    'admin@',
    '${hash}',
    'DB Administrator',
    'admin'
);`);
    } catch (err) {
        console.error('Error generating hash:', err);
    }
}

// Replace 'your-admin-password' with the actual password you want to use
generateHash('1234');