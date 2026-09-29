const db = require('../config/database');


// ============================================================
// ADMIN DASHBOARD
// ============================================================

const getDashboard = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT COUNT(*) AS count FROM `user`'
        );

        const [expenses] = await db.query(
            'SELECT COUNT(*) AS count FROM expense'
        );

        const [spending] = await db.query(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM expense'
        );

        const [budgets] = await db.query(
            'SELECT COUNT(*) AS count FROM categorybudget'
        );

        res.json({
            totalUsers: Number(users[0].count),
            totalExpenses: Number(expenses[0].count),
            totalSpending: Number(spending[0].total),
            totalBudgets: Number(budgets[0].count)
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);

        res.status(500).json({
            error: 'Server error retrieving admin dashboard'
        });
    }
};


// ============================================================
// GET ALL USERS
// ============================================================

const getUsers = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                id,
                name,
                email,
                role,
                status,
                createdAt
            FROM \`user\`
            ORDER BY createdAt DESC
        `);

        res.json({
            users: rows
        });

    } catch (error) {
        console.error('Admin users error:', error);

        res.status(500).json({
            error: 'Server error retrieving users'
        });
    }
};


// ============================================================
// UPDATE USER ROLE
// ============================================================

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['USER', 'ADMIN'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role'
            });
        }

        // Prevent admin from changing their own role
        if (Number(id) === Number(req.user.id)) {
            return res.status(400).json({
                error: 'You cannot change your own admin role'
            });
        }

        const [result] = await db.query(
            `UPDATE \`user\`
             SET role = ?, updatedAt = NOW(3)
             WHERE id = ?`,
            [role, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const [rows] = await db.query(
            `SELECT
                id,
                name,
                email,
                role,
                status
             FROM \`user\`
             WHERE id = ?`,
            [id]
        );

        res.json({
            user: rows[0]
        });

    } catch (error) {
        console.error('Update user role error:', error);

        res.status(500).json({
            error: 'Server error updating user role'
        });
    }
};


// ============================================================
// DELETE USER
// ============================================================

const deleteUser = async (req, res) => {
    const connection = await db.pool.getConnection();

    try {
        const { id } = req.params;

        // ----------------------------------------------------
        // Prevent admin from deleting their own account
        // ----------------------------------------------------

        if (Number(id) === Number(req.user.id)) {
            return res.status(400).json({
                error: 'You cannot delete your own account'
            });
        }

        // ----------------------------------------------------
        // Start transaction
        // ----------------------------------------------------

        await connection.beginTransaction();

        // ----------------------------------------------------
        // Check whether user exists
        // ----------------------------------------------------

        const [users] = await connection.execute(
            'SELECT id FROM `user` WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'User not found'
            });
        }

        // ----------------------------------------------------
        // Find all budgets belonging to this user
        // ----------------------------------------------------

        const [budgets] = await connection.execute(
            'SELECT id FROM budget WHERE userId = ?',
            [id]
        );

        const budgetIds = budgets.map((budget) => budget.id);

        // ----------------------------------------------------
        // Delete category budgets first
        // ----------------------------------------------------

        if (budgetIds.length > 0) {
            const placeholders = budgetIds
                .map(() => '?')
                .join(',');

            await connection.execute(
                `DELETE FROM categorybudget
                 WHERE budgetId IN (${placeholders})`,
                budgetIds
            );
        }

        // ----------------------------------------------------
        // Delete user's expenses
        // ----------------------------------------------------

        await connection.execute(
            'DELETE FROM expense WHERE userId = ?',
            [id]
        );

        // ----------------------------------------------------
        // Delete user's budgets
        // ----------------------------------------------------

        await connection.execute(
            'DELETE FROM budget WHERE userId = ?',
            [id]
        );

        // ----------------------------------------------------
        // Finally delete the user
        // ----------------------------------------------------

        await connection.execute(
            'DELETE FROM \`user\` WHERE id = ?',
            [id]
        );

        // ----------------------------------------------------
        // Commit transaction
        // ----------------------------------------------------

        await connection.commit();

        res.json({
            message: 'User and all associated data deleted successfully'
        });

    } catch (error) {

        // ----------------------------------------------------
        // Rollback if anything fails
        // ----------------------------------------------------

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                'Rollback error:',
                rollbackError
            );
        }

        console.error(
            'Delete user error:',
            error
        );

        res.status(500).json({
            error: 'Server error deleting user'
        });

    } finally {

        // ----------------------------------------------------
        // Release connection
        // ----------------------------------------------------

        connection.release();
    }
};


// ============================================================
// GET ALL EXPENSES
// ============================================================

const getExpenses = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.id,
                e.amount,
                e.expenseDate AS date,
                e.note,
                e.userId,
                e.categoryId,
                c.name AS category,
                u.name AS user_name,
                u.email AS user_email,
                e.createdAt
            FROM expense e
            JOIN \`user\` u
                ON e.userId = u.id
            JOIN category c
                ON e.categoryId = c.id
            ORDER BY
                e.expenseDate DESC,
                e.createdAt DESC
            LIMIT 100
        `);

        res.json({
            expenses: rows
        });

    } catch (error) {
        console.error(
            'Admin expenses error:',
            error
        );

        res.status(500).json({
            error: 'Server error retrieving expenses'
        });
    }
};


// ============================================================
// GET ALL BUDGETS
// ============================================================

const getBudgets = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                cb.id,
                cb.amount,
                cb.categoryId,
                c.name AS category,

                b.id AS budgetId,
                b.month,
                b.year,
                b.userId,

                u.name AS user_name,
                u.email AS user_email,

                b.createdAt

            FROM categorybudget cb

            JOIN budget b
                ON cb.budgetId = b.id

            JOIN category c
                ON cb.categoryId = c.id

            JOIN \`user\` u
                ON b.userId = u.id

            ORDER BY
                b.year DESC,
                b.month DESC,
                b.createdAt DESC

            LIMIT 100
        `);

        res.json({
            budgets: rows
        });

    } catch (error) {
        console.error(
            'Admin budgets error:',
            error
        );

        res.status(500).json({
            error: 'Server error retrieving budgets'
        });
    }
};


// ============================================================
// EXPORT CONTROLLERS
// ============================================================

module.exports = {
    getDashboard,
    getUsers,
    updateUserRole,
    deleteUser,
    getExpenses,
    getBudgets
};