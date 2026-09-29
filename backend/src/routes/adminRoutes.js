const express = require('express');
const { getDashboard, getUsers, updateUserRole, deleteUser, getExpenses, getBudgets } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/expenses', getExpenses);
router.get('/budgets', getBudgets);

module.exports = router;
