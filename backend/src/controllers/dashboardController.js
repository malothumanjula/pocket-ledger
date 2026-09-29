const db = require('../config/database');

const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get requested month, or use current month
        const requestedMonth = req.query.month;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonthNumber = String(currentDate.getMonth() + 1).padStart(2, '0');

        const month = requestedMonth || `${currentYear}-${currentMonthNumber}`;

        // ---------------------------------------------------------
        // 1. Total spending for selected month
        // ---------------------------------------------------------
        const [spendingRows] = await db.query(
            `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expense
            WHERE userId = ?
              AND DATE_FORMAT(expenseDate, '%Y-%m') = ?
            `,
            [userId, month]
        );

        const totalSpending = Number(spendingRows[0].total || 0);


        // ---------------------------------------------------------
        // 2. Total budget for selected month
        // ---------------------------------------------------------
        const [budgetRows] = await db.query(
            `
            SELECT COALESCE(totalBudget, 0) AS total
            FROM budget
            WHERE userId = ?
              AND month = ?
              AND year = ?
            LIMIT 1
            `,
            [
                userId,
                Number(month.substring(5, 7)),
                Number(month.substring(0, 4))
            ]
        );

        const totalBudget = Number(
            budgetRows.length > 0 ? budgetRows[0].total : 0
        );


        // ---------------------------------------------------------
        // 3. Category spending
        // ---------------------------------------------------------
        const [categoryRows] = await db.query(
            `
            SELECT
                c.id AS categoryId,
                c.name AS category,
                COALESCE(SUM(e.amount), 0) AS total
            FROM expense e
            JOIN category c
                ON e.categoryId = c.id
            WHERE e.userId = ?
              AND DATE_FORMAT(e.expenseDate, '%Y-%m') = ?
            GROUP BY c.id, c.name
            ORDER BY total DESC
            `,
            [userId, month]
        );

        const categorySpending = categoryRows.map(row => ({
            categoryId: row.categoryId,
            category: row.category,
            total: Number(row.total || 0)
        }));


        // ---------------------------------------------------------
        // 4. Six-month spending trend
        // ---------------------------------------------------------
        const [trendRows] = await db.query(
            `
            SELECT
                DATE_FORMAT(e.expenseDate, '%Y-%m') AS month_str,
                c.name AS category,
                COALESCE(SUM(e.amount), 0) AS total
            FROM expense e
            JOIN category c
                ON e.categoryId = c.id
            WHERE e.userId = ?
              AND e.expenseDate >= DATE_SUB(
                    DATE_FORMAT(CURDATE(), '%Y-%m-01'),
                    INTERVAL 5 MONTH
                  )
            GROUP BY
                DATE_FORMAT(e.expenseDate, '%Y-%m'),
                c.id,
                c.name
            ORDER BY
                month_str ASC,
                total DESC
            `,
            [userId]
        );

        const sixMonthTrend = trendRows.map(row => ({
            month_str: row.month_str,
            category: row.category,
            total: Number(row.total || 0)
        }));


        // ---------------------------------------------------------
        // 5. Spending by day of week
        // ---------------------------------------------------------
        const [dayOfWeekRows] = await db.query(
            `
            SELECT
                DAYOFWEEK(expenseDate) AS day_idx,
                COALESCE(SUM(amount), 0) AS total
            FROM expense
            WHERE userId = ?
              AND DATE_FORMAT(expenseDate, '%Y-%m') = ?
            GROUP BY DAYOFWEEK(expenseDate)
            ORDER BY day_idx
            `,
            [userId, month]
        );

        const dayOfWeekSpending = dayOfWeekRows.map(row => ({
            day_idx: Number(row.day_idx),
            total: Number(row.total || 0)
        }));


        // ---------------------------------------------------------
        // 6. Recent transactions
        // ---------------------------------------------------------
        const [recentRows] = await db.query(
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
            JOIN category c
                ON e.categoryId = c.id
            WHERE e.userId = ?
            ORDER BY
                e.expenseDate DESC,
                e.createdAt DESC
            LIMIT 10
            `,
            [userId]
        );

        const recentTransactions = recentRows.map(row => ({
            ...row,
            amount: Number(row.amount)
        }));


        // ---------------------------------------------------------
        // Response
        // ---------------------------------------------------------
        res.json({
            summary: {
                totalSpending,
                totalBudget,
                remainingBudget: totalBudget - totalSpending
            },
            categorySpending,
            sixMonthTrend,
            dayOfWeekSpending,
            recentTransactions
        });

    } catch (error) {
        console.error('Dashboard error:', error);

        res.status(500).json({
            error: 'Server error retrieving dashboard stats'
        });
    }
};


module.exports = {
    getDashboardStats
};