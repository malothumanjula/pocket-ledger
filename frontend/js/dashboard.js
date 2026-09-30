class Dashboard {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('user'));

        // Default currency is INR for Pocket Ledger
        this.currencySym = {
            INR: '₹',
            USD: '$',
            EUR: '€',
            GBP: '£'
        }[this.user?.currency] || '₹';

        this.monthSelector = document.getElementById('month-selector');

        this.trendChart = null;
        this.categoryChart = null;

        this.expenseModal = document.getElementById('expense-modal');
        this.budgetModal = document.getElementById('budget-modal');

        this.textColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-main')
            .trim();

        this.catColors = {
            'Housing': getComputedStyle(document.documentElement)
                .getPropertyValue('--housing-color').trim(),

            'Food & Dining': getComputedStyle(document.documentElement)
                .getPropertyValue('--food-color').trim(),

            'Transport': getComputedStyle(document.documentElement)
                .getPropertyValue('--transport-color').trim(),

            'Utilities': getComputedStyle(document.documentElement)
                .getPropertyValue('--utilities-color').trim(),

            'Shopping': getComputedStyle(document.documentElement)
                .getPropertyValue('--shopping-color').trim(),

            'Health': getComputedStyle(document.documentElement)
                .getPropertyValue('--health-color').trim(),

            'Entertainment': getComputedStyle(document.documentElement)
                .getPropertyValue('--entertainment-color').trim(),

            'Other': getComputedStyle(document.documentElement)
                .getPropertyValue('--other-color').trim()
        };

        this.init();
    }

    async init() {
        if (!this.user) {
            window.location.href = '/login.html';
            return;
        }

        const greeting = document.getElementById('greeting');

        if (greeting) {
            greeting.textContent = `Welcome, ${this.user.name || 'Back'}`;
        }

        const now = new Date();

        const currentMonth =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        this.monthSelector.value = currentMonth;

        this.monthSelector.addEventListener('change', () => {
            this.loadData();
        });

        // Redraw charts when theme changes
        const observer = new MutationObserver(() => {
            this.textColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-main')
                .trim();

            this.loadData();
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        this.bindEvents();

        await this.loadData();
    }

    /* =====================================================
       EVENTS
    ===================================================== */

    bindEvents() {

        // Main Add Expense button
        const addExpenseBtn = document.getElementById('add-expense-btn');

        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                this.openExpenseModal();
            });
        }

        // Quick Add Expense button
        const quickAddBtn = document.getElementById('quick-add-expense');

        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                this.openExpenseModal();
            });
        }

        // Add Budget
        const addBudgetBtn = document.getElementById('add-budget-btn');

        if (addBudgetBtn) {
            addBudgetBtn.addEventListener('click', () => {
                const form = document.getElementById('budget-form');

                if (form) {
                    form.reset();
                }

                this.budgetModal.classList.add('active');
            });
        }

        // Expense form
        const expenseForm = document.getElementById('expense-form');

        if (expenseForm) {
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveExpense();
            });
        }

        // Budget form
        const budgetForm = document.getElementById('budget-form');

        if (budgetForm) {
            budgetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveBudget();
            });
        }

        // View all button
        const viewAllBtn = document.getElementById('view-all-expenses');

        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                const table = document.getElementById('transactions-table');

                if (table) {
                    table.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            });
        }

        // Close modal when clicking outside
        [this.expenseModal, this.budgetModal].forEach(modal => {

            if (!modal) return;

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    openExpenseModal() {

        const form = document.getElementById('expense-form');

        if (form) {
            form.reset();
        }

        document.getElementById('expense-id').value = '';

        document.getElementById('expense-date').value =
            new Date().toISOString().substring(0, 10);

        document.getElementById('expense-modal-title').textContent =
            'Add Expense';

        this.expenseModal.classList.add('active');
    }

    /* =====================================================
       MONEY
    ===================================================== */

    formatMoney(amount) {

        const value = parseFloat(amount) || 0;

        return `${this.currencySym}${value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /* =====================================================
       LOAD DASHBOARD
    ===================================================== */

    async loadData() {

        try {

            const month = this.monthSelector.value;

            const data = await Api.get(
                `/dashboard?month=${month}`
            );

            const budgetData = await Api.get(
                `/budgets?month=${month}`
            );

            const transactions = data.recentTransactions || [];
            const categorySpending = data.categorySpending || [];
            const summary = data.summary || {};
            const budgets = budgetData.budgets || [];

            this.renderSummary(
                summary,
                categorySpending,
                transactions,
                month
            );

            this.renderTransactions(transactions);

            this.renderCategoryChart(categorySpending);

            this.renderTrendChart(
                data.sixMonthTrend || []
            );

            this.renderBudgetsUI(
                budgets,
                categorySpending
            );

            this.renderBudgetPace(
                summary
            );

            this.renderFinancialItems(
                categorySpending
            );

            this.renderWeekdaySpending(
                transactions
            );

        } catch (error) {

            console.error(
                'Dashboard data load error:',
                error
            );
        }
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    renderSummary(
        summary,
        categorySpending,
        transactions,
        month
    ) {

        const totalSpending =
            parseFloat(summary.totalSpending) || 0;

        const totalBudget =
            parseFloat(summary.totalBudget) || 0;

        const remainingBudget =
            parseFloat(summary.remainingBudget) ||
            (totalBudget - totalSpending);

        // Spent
        const spendingEl =
            document.getElementById('total-spending');

        if (spendingEl) {
            spendingEl.textContent =
                this.formatMoney(totalSpending);
        }

        // Budget
        const budgetEl =
            document.getElementById('total-budget');

        if (budgetEl) {
            budgetEl.textContent =
                this.formatMoney(totalBudget);
        }

        // Remaining
        const remainingEl =
            document.getElementById('remaining-budget');

        if (remainingEl) {

            remainingEl.textContent =
                this.formatMoney(remainingBudget);

            remainingEl.style.color =
                remainingBudget < 0
                    ? 'var(--danger)'
                    : 'var(--text-main)';
        }

        // Daily average
        const dailyAverageEl =
            document.getElementById('daily-average');

        if (dailyAverageEl) {

            const days = this.getDaysForMonth(month);

            const average =
                days > 0
                    ? totalSpending / days
                    : 0;

            dailyAverageEl.textContent =
                this.formatMoney(average);
        }

        // Top category
        const topCategoryEl =
            document.getElementById('top-category');

        if (topCategoryEl) {

            if (categorySpending.length === 0) {

                topCategoryEl.textContent = '—';

            } else {

                const sorted =
                    [...categorySpending].sort(
                        (a, b) =>
                            parseFloat(b.total) -
                            parseFloat(a.total)
                    );

                topCategoryEl.textContent =
                    sorted[0]?.category || '—';
            }
        }
    }

    getDaysForMonth(month) {

        const [year, monthNumber] =
            month.split('-').map(Number);

        const now = new Date();

        const isCurrentMonth =
            year === now.getFullYear() &&
            monthNumber === now.getMonth() + 1;

        if (isCurrentMonth) {
            return now.getDate();
        }

        return new Date(
            year,
            monthNumber,
            0
        ).getDate();
    }

    /* =====================================================
       BUDGET PACE
    ===================================================== */

    renderBudgetPace(summary) {

        const spent =
            parseFloat(summary.totalSpending) || 0;

        const budget =
            parseFloat(summary.totalBudget) || 0;

        const spentValue =
            document.getElementById('pace-spent');

        const budgetValue =
            document.getElementById('pace-budget');

        const spentBar =
            document.getElementById('pace-spent-bar');

        const budgetBar =
            document.getElementById('pace-budget-bar');

        if (spentValue) {
            spentValue.textContent =
                this.formatMoney(spent);
        }

        if (budgetValue) {
            budgetValue.textContent =
                this.formatMoney(budget);
        }

        if (spentBar) {

            const percentage =
                budget > 0
                    ? Math.min((spent / budget) * 100, 100)
                    : 0;

            spentBar.style.width =
                `${percentage}%`;

            if (percentage >= 100) {
                spentBar.style.background =
                    'var(--danger)';
            } else if (percentage >= 75) {
                spentBar.style.background =
                    'var(--warning)';
            } else {
                spentBar.style.background =
                    'var(--primary)';
            }
        }

        if (budgetBar) {
            budgetBar.style.width =
                budget > 0 ? '100%' : '0%';
        }
    }

    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    renderTransactions(transactions) {

        const tbody =
            document.querySelector(
                '#transactions-table tbody'
            );

        if (!tbody) return;

        tbody.innerHTML = '';

        if (!transactions.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4"
                        class="text-center text-muted">
                        No transactions found
                    </td>
                </tr>
            `;

            return;
        }

        transactions.forEach(tx => {

            const tr =
                document.createElement('tr');

            const dateStr =
                new Date(tx.date).toLocaleDateString(
                    undefined,
                    {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }
                );

            const color =
                this.catColors[tx.category] ||
                this.catColors['Other'];

            tr.innerHTML = `
                <td>${dateStr}</td>

                <td>
                    <span
                        class="pill"
                        style="
                            background:${color}22;
                            color:${color};
                        "
                    >
                        ${tx.category}
                    </span>
                </td>

                <td class="text-muted">
                    ${tx.note || '—'}
                </td>

                <td
                    style="
                        font-family:var(--font-mono);
                        font-weight:600;
                    "
                >
                    ${this.formatMoney(tx.amount)}
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    /* =====================================================
       CATEGORY BUDGETS
    ===================================================== */

    renderBudgetsUI(
        budgets,
        categorySpending
    ) {

        const container =
            document.getElementById('budgets-list');

        if (!container) return;

        container.innerHTML = '';

        if (!budgets.length) {

            container.innerHTML = `
                <p class="text-muted text-center">
                    No budgets set for this month.
                    Click "+ Add Budget" to begin.
                </p>
            `;

            return;
        }

        const spendingMap = {};

        categorySpending.forEach(item => {

            spendingMap[item.category] =
                parseFloat(item.total) || 0;
        });

        budgets.forEach(budget => {

            const spent =
                spendingMap[budget.category] || 0;

            const amount =
                parseFloat(budget.amount) || 0;

            const percent =
                amount > 0
                    ? Math.min(
                        (spent / amount) * 100,
                        100
                    )
                    : 0;

            let color =
                'var(--success)';

            let status =
                'On track';

            if (percent >= 100) {

                color = 'var(--danger)';
                status = 'Over budget';

            } else if (percent >= 75) {

                color = 'var(--warning)';
                status = 'Near limit';
            }

            const div =
                document.createElement('div');

            div.className =
                'budget-row';

            div.innerHTML = `
                <div class="budget-row-top">

                    <span class="budget-category">
                        ${budget.category}
                    </span>

                    <span class="budget-amount">
                        ${this.formatMoney(spent)}
                        /
                        ${this.formatMoney(amount)}
                    </span>

                </div>

                <div class="budget-progress">

                    <div
                        class="budget-progress-bar"
                        style="
                            width:${percent}%;
                            background:${color};
                        "
                    ></div>

                </div>

                <div
                    class="budget-status"
                    style="color:${color}"
                >
                    ${status} · ${percent.toFixed(0)}%
                </div>
            `;

            container.appendChild(div);
        });
    }

    /* =====================================================
       CATEGORY CHART
    ===================================================== */

    renderCategoryChart(categoryData) {

        const canvas =
            document.getElementById('categoryChart');

        if (!canvas) return;

        const ctx =
            canvas.getContext('2d');

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        if (!categoryData.length) {
            return;
        }

        this.categoryChart =
            new Chart(ctx, {

                type: 'doughnut',

                data: {

                    labels:
                        categoryData.map(
                            item => item.category
                        ),

                    datasets: [{

                        data:
                            categoryData.map(
                                item =>
                                    parseFloat(item.total) || 0
                            ),

                        backgroundColor:
                            categoryData.map(
                                item =>
                                    this.catColors[item.category] ||
                                    this.catColors['Other']
                            ),

                        borderWidth: 0,

                        hoverOffset: 6
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: '70%',

                    plugins: {

                        legend: {

                            position: 'bottom',

                            labels: {

                                color:
                                    this.textColor,

                                padding: 16,

                                usePointStyle: true,

                                pointStyle: 'circle',

                                font: {
                                    family:
                                        "'IBM Plex Sans', sans-serif"
                                }
                            }
                        },

                        tooltip: {

                            callbacks: {

                                label: (context) => {

                                    return ` ${this.formatMoney(
                                        context.raw
                                    )}`;
                                }
                            }
                        }
                    }
                }
            });
    }

    /* =====================================================
       SIX MONTH TREND
    ===================================================== */

    renderTrendChart(trendData) {

        const canvas =
            document.getElementById('trendChart');

        if (!canvas) return;

        const ctx =
            canvas.getContext('2d');

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        if (!trendData.length) {
            return;
        }

        const monthsSet = new Set();
        const catMap = {};

        trendData.forEach(item => {

            monthsSet.add(item.month_str);

            if (!catMap[item.category]) {
                catMap[item.category] = {};
            }

            catMap[item.category][item.month_str] =
                parseFloat(item.total) || 0;
        });

        const months =
            Array.from(monthsSet).sort();

        const datasets =
            Object.keys(catMap).map(category => {

                return {

                    label: category,

                    data: months.map(
                        month =>
                            catMap[category][month] || 0
                    ),

                    backgroundColor:
                        this.catColors[category] ||
                        this.catColors['Other'],

                    stack: 'spending',

                    borderRadius: 4,

                    borderSkipped: false
                };
            });

        this.trendChart =
            new Chart(ctx, {

                type: 'bar',

                data: {

                    labels: months,

                    datasets
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        x: {

                            stacked: true,

                            grid: {
                                display: false
                            },

                            ticks: {

                                color:
                                    this.textColor,

                                font: {
                                    family:
                                        "'IBM Plex Mono', monospace"
                                }
                            }
                        },

                        y: {

                            stacked: true,

                            beginAtZero: true,

                            border: {
                                display: false
                            },

                            grid: {

                                color:
                                    getComputedStyle(
                                        document.documentElement
                                    )
                                        .getPropertyValue(
                                            '--border-color'
                                        )
                                        .trim()
                            },

                            ticks: {
                                color:
                                    this.textColor
                            }
                        }
                    },

                    plugins: {

                        legend: {

                            position: 'bottom',

                            labels: {

                                color:
                                    this.textColor,

                                usePointStyle: true,

                                pointStyle: 'circle',

                                padding: 14
                            }
                        }
                    }
                }
            });
    }

    /* =====================================================
       EMI & SIP
    ===================================================== */

    renderFinancialItems(categorySpending) {

        const emiEl =
            document.getElementById('emi-value');

        const sipEl =
            document.getElementById('sip-value');

        if (!emiEl && !sipEl) return;

        let emi = 0;
        let sip = 0;

        categorySpending.forEach(item => {

            const category =
                String(item.category || '').toLowerCase();

            const amount =
                parseFloat(item.total) || 0;

            if (category === 'emi') {
                emi += amount;
            }

            if (category === 'sip') {
                sip += amount;
            }
        });

        if (emiEl) {
            emiEl.textContent =
                emi > 0
                    ? this.formatMoney(emi)
                    : '—';
        }

        if (sipEl) {
            sipEl.textContent =
                sip > 0
                    ? this.formatMoney(sip)
                    : '—';
        }
    }

    /* =====================================================
       WEEKDAY SPENDING
    ===================================================== */

    renderWeekdaySpending(transactions) {

        const items =
            document.querySelectorAll(
                '.weekday-item'
            );

        if (!items.length) return;

        const totals = [
            0, // Mon
            0, // Tue
            0, // Wed
            0, // Thu
            0, // Fri
            0, // Sat
            0  // Sun
        ];

        transactions.forEach(tx => {

            const date =
                new Date(tx.date);

            if (Number.isNaN(date.getTime())) {
                return;
            }

            let day =
                date.getDay();

            // Convert Sunday=0 format to Monday=0
            day =
                day === 0
                    ? 6
                    : day - 1;

            totals[day] +=
                parseFloat(tx.amount) || 0;
        });

        const max =
            Math.max(...totals, 1);

        items.forEach((item, index) => {

            const value =
                totals[index];

            const bar =
                item.querySelector(
                    '.weekday-bar div'
                );

            const valueEl =
                item.querySelector('strong');

            if (bar) {

                bar.style.height =
                    `${(value / max) * 100}%`;
            }

            if (valueEl) {

                valueEl.textContent =
                    value > 0
                        ? this.formatMoney(value)
                        : '—';
            }
        });
    }

    /* =====================================================
       SAVE EXPENSE
    ===================================================== */

    async saveExpense() {

        const amount =
            document.getElementById(
                'expense-amount'
            ).value;

        const date =
            document.getElementById(
                'expense-date'
            ).value;

        const category =
            document.getElementById(
                'expense-category'
            ).value;

        const note =
            document.getElementById(
                'expense-note'
            ).value;

        try {

            await Api.post(
                '/expenses',
                {
                    amount,
                    date,
                    category,
                    note
                }
            );

            this.expenseModal
                .classList
                .remove('active');

            await this.loadData();

        } catch (error) {

            alert(
                'Error saving expense: ' +
                error.message
            );
        }
    }

    /* =====================================================
       SAVE BUDGET
    ===================================================== */

    async saveBudget() {

        const category =
            document.getElementById(
                'budget-category'
            ).value;

        const amount =
            document.getElementById(
                'budget-amount'
            ).value;

        const month =
            this.monthSelector.value;

        try {

            await Api.post(
                '/budgets',
                {
                    category,
                    amount,
                    month
                }
            );

            this.budgetModal
                .classList
                .remove('active');

            await this.loadData();

        } catch (error) {

            alert(
                'Error saving budget: ' +
                error.message
            );
        }
    }
}

/* =========================================================
   START DASHBOARD
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    () => {
        new Dashboard();
    }
);