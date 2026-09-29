const db = require('../config/database');


// Get expenses for logged-in user
const getExpenses = async (req, res) => {
    try {
        const { month, category, search, from, to } = req.query;

        let query = `
            SELECT
                e.id,
                e.amount,
                e.expenseDate,
                e.note,
                e.userId,
                e.categoryId,
                c.name AS category,
                e.createdAt,
                e.updatedAt
            FROM expense e
            JOIN category c ON e.categoryId = c.id
            WHERE e.userId = ?
        `;

        const params = [req.user.id];

        if (month) {
            query += ` AND DATE_FORMAT(e.expenseDate, '%Y-%m') = ?`;
            params.push(month);
        }

        if (category) {
            query += ` AND c.name = ?`;
            params.push(category);
        }

        if (search) {
            query += ` AND e.note LIKE ?`;
            params.push(`%${search}%`);
        }

        if (from) {
            query += ` AND DATE(e.expenseDate) >= ?`;
            params.push(from);
        }

        if (to) {
            query += ` AND DATE(e.expenseDate) <= ?`;
            params.push(to);
        }

        query += `
            ORDER BY e.expenseDate DESC, e.createdAt DESC
        `;

        const [rows] = await db.query(query, params);

        res.json({
            expenses: rows
        });

    } catch (error) {
        console.error('Get expenses error:', error);

        res.status(500).json({
            error: 'Server error retrieving expenses'
        });
    }
};


// Get one expense
const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `
            SELECT
                e.id,
                e.amount,
                e.expenseDate,
                e.note,
                e.userId,
                e.categoryId,
                c.name AS category,
                e.createdAt,
                e.updatedAt
            FROM expense e
            JOIN category c ON e.categoryId = c.id
            WHERE e.id = ?
              AND e.userId = ?
            `,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Expense not found'
            });
        }

        res.json({
            expense: rows[0]
        });

    } catch (error) {
        console.error('Get expense error:', error);

        res.status(500).json({
            error: 'Server error retrieving expense'
        });
    }
};


// Create expense
const createExpense = async (req, res) => {
    try {
        const {
            amount,
            date,
            category,
            note
        } = req.body;

        if (!amount || !date || !category) {
            return res.status(400).json({
                error: 'Amount, date, and category are required'
            });
        }

        /*
         * Frontend may send either:
         *   category: "Food & Dining"
         * or
         *   category: 2
         *
         * We support both.
         */

        let categoryId;

        if (!isNaN(category)) {
            categoryId = Number(category);
        } else {
            const [categoryRows] = await db.query(
                `
                SELECT id
                FROM category
                WHERE name = ?
                  AND status = 'ACTIVE'
                `,
                [category]
            );

            if (categoryRows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid category'
                });
            }

            categoryId = categoryRows[0].id;
        }

        // Make sure category exists
        const [categoryRows] = await db.query(
            `
            SELECT id
            FROM category
            WHERE id = ?
              AND status = 'ACTIVE'
            `,
            [categoryId]
        );

        if (categoryRows.length === 0) {
            return res.status(400).json({
                error: 'Invalid category'
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO expense
                (amount, expenseDate, note, userId, categoryId, createdAt, updatedAt)
            VALUES
                (?, ?, ?, ?, ?, NOW(3), NOW(3))
            `,
            [
                amount,
                date,
                note || null,
                req.user.id,
                categoryId
            ]
        );

        // Fetch created expense with category name
        const [newExpenses] = await db.query(
            `
            SELECT
                e.id,
                e.amount,
                e.expenseDate,
                e.note,
                e.userId,
                e.categoryId,
                c.name AS category,
                e.createdAt,
                e.updatedAt
            FROM expense e
            JOIN category c ON e.categoryId = c.id
            WHERE e.id = ?
            `,
            [result.insertId]
        );

        res.status(201).json({
            expense: newExpenses[0]
        });

    } catch (error) {
        console.error('Create expense error:', error);

        res.status(500).json({
            error: 'Server error creating expense'
        });
    }
};


// Update expense
const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount,
            date,
            category,
            note
        } = req.body;

        // Check expense belongs to logged-in user
        const [existingExpenses] = await db.query(
            `
            SELECT *
            FROM expense
            WHERE id = ?
              AND userId = ?
            `,
            [id, req.user.id]
        );

        if (existingExpenses.length === 0) {
            return res.status(404).json({
                error: 'Expense not found or unauthorized'
            });
        }

        const existing = existingExpenses[0];

        let categoryId = existing.categoryId;

        if (category !== undefined && category !== null && category !== '') {

            if (!isNaN(category)) {
                categoryId = Number(category);
            } else {
                const [categoryRows] = await db.query(
                    `
                    SELECT id
                    FROM category
                    WHERE name = ?
                      AND status = 'ACTIVE'
                    `,
                    [category]
                );

                if (categoryRows.length === 0) {
                    return res.status(400).json({
                        error: 'Invalid category'
                    });
                }

                categoryId = categoryRows[0].id;
            }
        }

        await db.query(
            `
            UPDATE expense
            SET
                amount = ?,
                expenseDate = ?,
                categoryId = ?,
                note = ?,
                updatedAt = NOW(3)
            WHERE id = ?
              AND userId = ?
            `,
            [
                amount !== undefined ? amount : existing.amount,
                date !== undefined ? date : existing.expenseDate,
                categoryId,
                note !== undefined ? note : existing.note,
                id,
                req.user.id
            ]
        );

        const [updatedExpenses] = await db.query(
            `
            SELECT
                e.id,
                e.amount,
                e.expenseDate,
                e.note,
                e.userId,
                e.categoryId,
                c.name AS category,
                e.createdAt,
                e.updatedAt
            FROM expense e
            JOIN category c ON e.categoryId = c.id
            WHERE e.id = ?
            `,
            [id]
        );

        res.json({
            expense: updatedExpenses[0]
        });

    } catch (error) {
        console.error('Update expense error:', error);

        res.status(500).json({
            error: 'Server error updating expense'
        });
    }
};


// Delete expense
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `
            DELETE FROM expense
            WHERE id = ?
              AND userId = ?
            `,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Expense not found or unauthorized'
            });
        }

        res.json({
            message: 'Expense deleted successfully'
        });

    } catch (error) {
        console.error('Delete expense error:', error);

        res.status(500).json({
            error: 'Server error deleting expense'
        });
    }
};


module.exports = {
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};