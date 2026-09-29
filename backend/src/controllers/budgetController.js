const db = require('../config/database');


// Get budgets for logged-in user
const getBudgets = async (req, res) => {
    try {
        const { month } = req.query;

        let query = `
            SELECT
                cb.id,
                cb.amount,
                cb.budgetId,
                cb.categoryId,
                c.name AS category,
                b.month,
                b.year,
                b.totalBudget,
                b.userId,
                b.createdAt,
                b.updatedAt
            FROM categorybudget cb
            JOIN budget b
                ON cb.budgetId = b.id
            JOIN category c
                ON cb.categoryId = c.id
            WHERE b.userId = ?
        `;

        const params = [req.user.id];

        // month can be YYYY-MM
        if (month) {
            const year = Number(month.substring(0, 4));
            const monthNumber = Number(month.substring(5, 7));

            query += `
                AND b.year = ?
                AND b.month = ?
            `;

            params.push(year, monthNumber);
        }

        query += `
            ORDER BY b.year DESC, b.month DESC, c.name ASC
        `;

        const [rows] = await db.query(query, params);

        res.json({
            budgets: rows.map(row => ({
                ...row,
                amount: Number(row.amount),
                totalBudget: Number(row.totalBudget)
            }))
        });

    } catch (error) {
        console.error('Get budgets error:', error);

        res.status(500).json({
            error: 'Server error retrieving budgets'
        });
    }
};


// Create or update category budget
const createBudget = async (req, res) => {
    try {
        const {
            category,
            amount,
            month
        } = req.body;

        if (!category || !amount || !month) {
            return res.status(400).json({
                error: 'Category, amount, and month are required'
            });
        }

        const year = Number(month.substring(0, 4));
        const monthNumber = Number(month.substring(5, 7));

        if (!year || !monthNumber) {
            return res.status(400).json({
                error: 'Month must be in YYYY-MM format'
            });
        }


        // Find category
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


        // Check whether budget header exists
        const [budgetRows] = await db.query(
            `
            SELECT id, totalBudget
            FROM budget
            WHERE userId = ?
              AND month = ?
              AND year = ?
            LIMIT 1
            `,
            [
                req.user.id,
                monthNumber,
                year
            ]
        );

        let budgetId;

        if (budgetRows.length === 0) {

            // Create budget header
            const [budgetResult] = await db.query(
                `
                INSERT INTO budget
                    (month, year, totalBudget, userId, createdAt, updatedAt)
                VALUES
                    (?, ?, ?, ?, NOW(3), NOW(3))
                `,
                [
                    monthNumber,
                    year,
                    Number(amount),
                    req.user.id
                ]
            );

            budgetId = budgetResult.insertId;

        } else {

            budgetId = budgetRows[0].id;

            // Recalculate total after category budget changes
            const [currentCategoryBudgets] = await db.query(
                `
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM categorybudget
                WHERE budgetId = ?
                  AND categoryId <> ?
                `,
                [budgetId, categoryId]
            );

            const newTotal =
                Number(currentCategoryBudgets[0].total || 0) +
                Number(amount);

            await db.query(
                `
                UPDATE budget
                SET totalBudget = ?,
                    updatedAt = NOW(3)
                WHERE id = ?
                  AND userId = ?
                `,
                [
                    newTotal,
                    budgetId,
                    req.user.id
                ]
            );
        }


        // Check whether category budget already exists
        const [existingCategoryBudget] = await db.query(
            `
            SELECT id
            FROM categorybudget
            WHERE budgetId = ?
              AND categoryId = ?
            LIMIT 1
            `,
            [
                budgetId,
                categoryId
            ]
        );


        let categoryBudgetId;

        if (existingCategoryBudget.length > 0) {

            categoryBudgetId = existingCategoryBudget[0].id;

            await db.query(
                `
                UPDATE categorybudget
                SET amount = ?
                WHERE id = ?
                `,
                [
                    Number(amount),
                    categoryBudgetId
                ]
            );

        } else {

            const [result] = await db.query(
                `
                INSERT INTO categorybudget
                    (amount, budgetId, categoryId)
                VALUES
                    (?, ?, ?)
                `,
                [
                    Number(amount),
                    budgetId,
                    categoryId
                ]
            );

            categoryBudgetId = result.insertId;
        }


        // Recalculate total budget from category budgets
        const [totalRows] = await db.query(
            `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM categorybudget
            WHERE budgetId = ?
            `,
            [budgetId]
        );

        const totalBudget = Number(totalRows[0].total || 0);

        await db.query(
            `
            UPDATE budget
            SET totalBudget = ?,
                updatedAt = NOW(3)
            WHERE id = ?
              AND userId = ?
            `,
            [
                totalBudget,
                budgetId,
                req.user.id
            ]
        );


        // Return created/updated budget
        const [resultRows] = await db.query(
            `
            SELECT
                cb.id,
                cb.amount,
                cb.budgetId,
                cb.categoryId,
                c.name AS category,
                b.month,
                b.year,
                b.totalBudget,
                b.userId,
                b.createdAt,
                b.updatedAt
            FROM categorybudget cb
            JOIN budget b
                ON cb.budgetId = b.id
            JOIN category c
                ON cb.categoryId = c.id
            WHERE cb.id = ?
              AND b.userId = ?
            `,
            [
                categoryBudgetId,
                req.user.id
            ]
        );

        res.status(201).json({
            budget: {
                ...resultRows[0],
                amount: Number(resultRows[0].amount),
                totalBudget: Number(resultRows[0].totalBudget)
            }
        });

    } catch (error) {
        console.error('Create budget error:', error);

        res.status(500).json({
            error: 'Server error creating budget'
        });
    }
};


// Update category budget
const updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (amount === undefined || amount === null) {
            return res.status(400).json({
                error: 'Amount is required'
            });
        }

        // Find category budget belonging to logged-in user
        const [rows] = await db.query(
            `
            SELECT
                cb.id,
                cb.budgetId,
                cb.categoryId,
                b.userId
            FROM categorybudget cb
            JOIN budget b
                ON cb.budgetId = b.id
            WHERE cb.id = ?
              AND b.userId = ?
            `,
            [
                id,
                req.user.id
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Budget not found or unauthorized'
            });
        }

        const budgetId = rows[0].budgetId;


        // Update category amount
        await db.query(
            `
            UPDATE categorybudget
            SET amount = ?
            WHERE id = ?
            `,
            [
                Number(amount),
                id
            ]
        );


        // Recalculate total budget
        const [totalRows] = await db.query(
            `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM categorybudget
            WHERE budgetId = ?
            `,
            [budgetId]
        );

        const totalBudget = Number(totalRows[0].total || 0);


        await db.query(
            `
            UPDATE budget
            SET totalBudget = ?,
                updatedAt = NOW(3)
            WHERE id = ?
              AND userId = ?
            `,
            [
                totalBudget,
                budgetId,
                req.user.id
            ]
        );


        // Return updated budget
        const [updatedRows] = await db.query(
            `
            SELECT
                cb.id,
                cb.amount,
                cb.budgetId,
                cb.categoryId,
                c.name AS category,
                b.month,
                b.year,
                b.totalBudget,
                b.userId,
                b.createdAt,
                b.updatedAt
            FROM categorybudget cb
            JOIN budget b
                ON cb.budgetId = b.id
            JOIN category c
                ON cb.categoryId = c.id
            WHERE cb.id = ?
              AND b.userId = ?
            `,
            [
                id,
                req.user.id
            ]
        );

        res.json({
            budget: {
                ...updatedRows[0],
                amount: Number(updatedRows[0].amount),
                totalBudget: Number(updatedRows[0].totalBudget)
            }
        });

    } catch (error) {
        console.error('Update budget error:', error);

        res.status(500).json({
            error: 'Server error updating budget'
        });
    }
};


// Delete category budget
const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;

        // Find category budget
        const [rows] = await db.query(
            `
            SELECT
                cb.id,
                cb.budgetId
            FROM categorybudget cb
            JOIN budget b
                ON cb.budgetId = b.id
            WHERE cb.id = ?
              AND b.userId = ?
            `,
            [
                id,
                req.user.id
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Budget not found or unauthorized'
            });
        }

        const budgetId = rows[0].budgetId;


        // Delete category budget
        await db.query(
            `
            DELETE FROM categorybudget
            WHERE id = ?
            `,
            [id]
        );


        // Recalculate total budget
        const [totalRows] = await db.query(
            `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM categorybudget
            WHERE budgetId = ?
            `,
            [budgetId]
        );

        const totalBudget = Number(totalRows[0].total || 0);


        // Update budget header
        await db.query(
            `
            UPDATE budget
            SET totalBudget = ?,
                updatedAt = NOW(3)
            WHERE id = ?
              AND userId = ?
            `,
            [
                totalBudget,
                budgetId,
                req.user.id
            ]
        );


        res.json({
            message: 'Budget deleted successfully'
        });

    } catch (error) {
        console.error('Delete budget error:', error);

        res.status(500).json({
            error: 'Server error deleting budget'
        });
    }
};


module.exports = {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
};