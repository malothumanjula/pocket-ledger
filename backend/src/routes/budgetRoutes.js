const express = require('express');
const { getBudgets, createBudget, updateBudget, deleteBudget } = require('../controllers/budgetController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getBudgets);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
