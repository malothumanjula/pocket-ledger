const express = require('express');
const { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getExpenses);
router.post('/', createExpense);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
