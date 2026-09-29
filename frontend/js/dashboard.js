class Dashboard {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('user'));
        this.currencySym = {
            'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£'
        }[this.user?.currency] || '$';

        this.monthSelector = document.getElementById('month-selector');

        // Charts
        this.trendChart = null;
        this.categoryChart = null;

        // Modals
        this.expenseModal = document.getElementById('expense-modal');
        this.budgetModal = document.getElementById('budget-modal');

        // Detect dark theme property changes from the DOM for dynamically changing chart styling
        this.textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim();

        // Chart Colors
        this.catColors = {
            'Housing': getComputedStyle(document.documentElement).getPropertyValue('--housing-color').trim(),
            'Food & Dining': getComputedStyle(document.documentElement).getPropertyValue('--food-color').trim(),
            'Transport': getComputedStyle(document.documentElement).getPropertyValue('--transport-color').trim(),
            'Utilities': getComputedStyle(document.documentElement).getPropertyValue('--utilities-color').trim(),
            'Shopping': getComputedStyle(document.documentElement).getPropertyValue('--shopping-color').trim(),
            'Health': getComputedStyle(document.documentElement).getPropertyValue('--health-color').trim(),
            'Entertainment': getComputedStyle(document.documentElement).getPropertyValue('--entertainment-color').trim(),
            'Other': getComputedStyle(document.documentElement).getPropertyValue('--other-color').trim(),
        };

        this.init();
    }

    async init() {
        if (!this.user) {
            window.location.href = '/login.html';
            return;
        }

        document.getElementById('greeting').textContent = `Welcome, ${this.user.name}`;

        // Set default month to current
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.monthSelector.value = currentMonth;

        this.monthSelector.addEventListener('change', () => this.loadData());

        // Check theme changes to redraw charts
        const obs = new MutationObserver(() => {
            this.textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim();
            this.loadData();
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        this.bindEvents();
        await this.loadData();
    }

    bindEvents() {
        document.getElementById('add-expense-btn').addEventListener('click', () => {
            document.getElementById('expense-form').reset();
            document.getElementById('expense-id').value = '';
            document.getElementById('expense-date').value = new Date().toISOString().substring(0, 10);
            document.getElementById('expense-modal-title').textContent = 'Add Expense';
            this.expenseModal.classList.add('active');
        });

        document.getElementById('add-budget-btn').addEventListener('click', () => {
            document.getElementById('budget-form').reset();
            this.budgetModal.classList.add('active');
        });

        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveExpense();
        });

        document.getElementById('budget-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBudget();
        });
    }

    formatMoney(amount) {
        return `${this.currencySym}${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async loadData() {
        try {
            const month = this.monthSelector.value;
            const data = await Api.get(`/dashboard?month=${month}`);
            this.renderSummary(data.summary);
            this.renderTransactions(data.recentTransactions);
            this.renderCategoryChart(data.categorySpending);
            this.renderTrendChart(data.sixMonthTrend);

            const bData = await Api.get(`/budgets?month=${month}`);
            this.renderBudgetsUI(bData.budgets, data.categorySpending);
        } catch (e) {
            console.error('Data load error', e);
        }
    }

    renderSummary(summary) {
        document.getElementById('total-spending').textContent = this.formatMoney(summary.totalSpending);
        document.getElementById('total-budget').textContent = this.formatMoney(summary.totalBudget);

        const remainingEl = document.getElementById('remaining-budget');
        remainingEl.textContent = this.formatMoney(summary.remainingBudget);
        remainingEl.style.color = summary.remainingBudget < 0 ? 'var(--danger)' : 'var(--text-main)';
    }

    renderTransactions(transactions) {
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions found</td></tr>';
            return;
        }

        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            const dateStr = new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const color = this.catColors[tx.category] || this.catColors['Other'];
            tr.innerHTML = `
        <td>${dateStr}</td>
        <td><span class="pill" style="background: ${color}22; color: ${color}">${tx.category}</span></td>
        <td class="text-muted"><small>${tx.note || ''}</small></td>
        <td style="font-weight: 500;">${this.formatMoney(tx.amount)}</td>
      `;
            tbody.appendChild(tr);
        });
    }

    renderBudgetsUI(budgets, categorySpending) {
        const container = document.getElementById('budgets-list');
        container.innerHTML = '';

        if (budgets.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No budgets set for this month. Click "+ Add Budget" to begin.</p>';
            return;
        }

        const spendingMap = {};
        categorySpending.forEach(c => spendingMap[c.category] = parseFloat(c.total));

        budgets.forEach(b => {
            const spent = spendingMap[b.category] || 0;
            const amount = parseFloat(b.amount);
            const percent = Math.min(100, (spent / amount) * 100);
            const color = percent > 90 ? 'var(--danger)' : percent > 75 ? 'var(--warning)' : 'var(--success)';

            const div = document.createElement('div');
            div.style.marginBottom = '1.25rem';
            div.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <span style="font-weight: 600; font-size: 0.9rem">${b.category}</span>
          <span class="text-muted" style="font-size: 0.85rem">
            ${this.formatMoney(spent)} / ${this.formatMoney(amount)}
          </span>
        </div>
        <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 99px; overflow: hidden;">
          <div style="width: ${percent}%; height: 100%; background: ${color}; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
      `;
            container.appendChild(div);
        });
    }

    renderCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        if (this.categoryChart) this.categoryChart.destroy();

        if (categoryData.length === 0) return;

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.map(d => d.category),
                datasets: [{
                    data: categoryData.map(d => parseFloat(d.total)),
                    backgroundColor: categoryData.map(d => this.catColors[d.category] || this.catColors['Other']),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: this.textColor, padding: 20, font: { family: "'IBM Plex Sans', sans-serif" } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${this.formatMoney(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }

    renderTrendChart(trendData) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        if (this.trendChart) this.trendChart.destroy();

        const monthsSet = new Set();
        const catMap = {};

        trendData.forEach(d => {
            monthsSet.add(d.month_str);
            if (!catMap[d.category]) catMap[d.category] = {};
            catMap[d.category][d.month_str] = parseFloat(d.total);
        });

        const months = Array.from(monthsSet).sort();

        const datasets = Object.keys(catMap).map(category => ({
            label: category,
            data: months.map(m => catMap[category][m] || 0),
            backgroundColor: this.catColors[category] || this.catColors['Other'],
            stack: 'Stack 0',
            borderRadius: 4
        }));

        this.trendChart = new Chart(ctx, {
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
                        grid: { display: false },
                        ticks: { color: this.textColor, font: { family: "'IBM Plex Mono', monospace" } }
                    },
                    y: {
                        stacked: true,
                        border: { display: false },
                        grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() },
                        ticks: { color: this.textColor }
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { color: this.textColor, font: { family: "'IBM Plex Sans', sans-serif" } } }
                }
            }
        });
    }

    async saveExpense() {
        const amount = document.getElementById('expense-amount').value;
        const date = document.getElementById('expense-date').value;
        const category = document.getElementById('expense-category').value;
        const note = document.getElementById('expense-note').value;

        try {
            await Api.post('/expenses', { amount, date, category, note });
            this.expenseModal.classList.remove('active');
            this.loadData();
        } catch (e) {
            alert('Error saving expense: ' + e.message);
        }
    }

    async saveBudget() {
        const category = document.getElementById('budget-category').value;
        const amount = document.getElementById('budget-amount').value;
        const month = this.monthSelector.value;

        try {
            await Api.post('/budgets', { category, amount, month });
            this.budgetModal.classList.remove('active');
            this.loadData();
        } catch (e) {
            alert('Error saving budget: ' + e.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
