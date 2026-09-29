const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM `user` WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await db.query(
            `INSERT INTO \`user\`
                (name, email, password, role, status, createdAt, updatedAt)
             VALUES (?, ?, ?, 'USER', 'ACTIVE', NOW(3), NOW(3))`,
            [name, email, passwordHash]
        );

        // Fetch created user
        const [newUsers] = await db.query(
            `SELECT id, name, email, role, status, createdAt, updatedAt
             FROM \`user\`
             WHERE id = ?`,
            [result.insertId]
        );

        const user = newUsers[0];

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        return res.status(201).json({
            user,
            token
        });

    } catch (error) {
        console.error('Register error:', error);

        return res.status(500).json({
            error: 'Server error during registration'
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Find user
        const [users] = await db.query(
            `SELECT *
             FROM \`user\`
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check account status
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                error: 'User account is inactive'
            });
        }

        // Check password
        const isValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        // Never send password back to frontend
        delete user.password;

        return res.json({
            user,
            token
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            error: 'Server error during login'
        });
    }
};


const me = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, name, email, role, status, createdAt, updatedAt
             FROM \`user\`
             WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        return res.json({
            user: users[0]
        });

    } catch (error) {
        console.error('Me error:', error);

        return res.status(500).json({
            error: 'Server error fetching user profile'
        });
    }
};


const logout = (req, res) => {
    // JWT is stateless, so logout is handled by the frontend
    // removing the stored token.
    return res.json({
        message: 'Logged out successfully'
    });
};


module.exports = {
    register,
    login,
    me,
    logout
};