class AdminDashboard {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('user'));
        this.init();
    }

    async init() {
        if (!this.user || this.user.role !== 'ADMIN') {
            alert('Unauthorized. Admin access only.');
            window.location.href = '/';
            return;
        }

        await this.loadData();
    }

    async loadData() {
        try {
            const stats = await Api.get('/admin/dashboard');

            document.getElementById('admin-users').textContent = stats.totalUsers;
            document.getElementById('admin-expenses-count').textContent = stats.totalExpenses;
            document.getElementById('admin-spending').textContent =
                Number(stats.totalSpending).toLocaleString(undefined, {
                    minimumFractionDigits: 2
                });
            document.getElementById('admin-budgets').textContent = stats.totalBudgets;

            const usersData = await Api.get('/admin/users');
            this.renderUsers(usersData.users);

            const expensesData = await Api.get('/admin/expenses');
            this.renderExpenses(expensesData.expenses);

            const budgetsData = await Api.get('/admin/budgets');
            this.renderBudgets(budgetsData.budgets);

        } catch (e) {
            console.error('Admin Load Error:', e);

            if (e.message && e.message.includes('Forbidden')) {
                window.location.href = '/';
            }
        }
    }

    renderUsers(users) {
        const tbody = document.querySelector('#admin-users-table tbody');

        if (!tbody) {
            console.error('Admin users table not found');
            return;
        }

        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');

            const isCurrentUser = Number(u.id) === Number(this.user.id);

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500">${u.name}</div>
                    <div class="text-muted" style="font-size: 0.75rem">
                        ${u.email}
                    </div>
                </td>

                <td>
                    <select
                        class="role-select"
                        data-id="${u.id}"
                        ${isCurrentUser ? 'disabled' : ''}
                    >
                        <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>
                            USER
                        </option>

                        <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>
                            ADMIN
                        </option>
                    </select>
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-outline delete-user-btn"
                        data-id="${u.id}"
                        ${isCurrentUser ? 'disabled' : ''}
                        style="
                            border-color: var(--danger);
                            color: var(--danger);
                            padding: 0.25rem 0.5rem;
                        "
                    >
                        Del
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // =========================
        // ROLE CHANGE
        // =========================

        document.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const role = e.target.value;

                try {
                    await Api.patch(`/admin/users/${id}/role`, {
                        role
                    });

                    alert('Role updated successfully');

                    // Refresh user list
                    await this.loadData();

                } catch (err) {
                    console.error('Role update error:', err);

                    alert('Failed to update role');

                    await this.loadData();
                }
            });
        });

        // =========================
        // DELETE USER
        // =========================

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');

                const confirmed = confirm(
                    'Are you sure you want to delete this user?\n\n' +
                    'ALL THEIR EXPENSES AND BUDGETS WILL ALSO BE DELETED.'
                );

                if (!confirmed) {
                    return;
                }

                try {
                    button.disabled = true;
                    button.textContent = 'Deleting...';

                    await Api.delete(`/admin/users/${id}`);

                    alert('User deleted successfully');

                    // Reload admin data
                    await this.loadData();

                } catch (error) {
                    console.error('Delete user error:', error);

                    alert(
                        'Error deleting user: ' +
                        (error.message || 'Unknown error')
                    );

                    button.disabled = false;
                    button.textContent = 'Del';
                }
            });
        });
    }

    renderExpenses(expenses) {
        const tbody = document.querySelector('#admin-expenses-table tbody');

        if (!tbody) {
            console.error('Admin expenses table not found');
            return;
        }

        tbody.innerHTML = '';

        expenses.forEach(e => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>
                    <small>${e.user_name}</small>
                </td>

                <td>
                    <span
                        class="pill"
                        style="border: 1px solid var(--border-color)"
                    >
                        ${e.category}
                    </span>
                </td>

                <td style="font-weight: 500">
                    ${parseFloat(e.amount).toLocaleString()}
                </td>

                <td>
                    <span
                        class="text-muted"
                        style="font-size: 0.85rem"
                    >
                        ${new Date(e.date).toLocaleDateString()}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    renderBudgets(budgets) {
        const tbody = document.querySelector('#admin-budgets-table tbody');

        if (!tbody) {
            console.error('Admin budgets table not found');
            return;
        }

        tbody.innerHTML = '';

        budgets.forEach(b => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>
                    <small>${b.user_name}</small>
                </td>

                <td>
                    ${b.category}
                </td>

                <td>
                    ${b.month}
                </td>

                <td style="font-weight: 500">
                    ${parseFloat(b.amount).toLocaleString()}
                </td>
            `;

            tbody.appendChild(tr);
        });
    }
}


// =========================
// PAGE LOAD
// =========================

document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminDashboard();
});