// Global App logic: theme, logout, user session
class App {
    static init() {
        this.initTheme();
        this.setupLogout();
    }

    static initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    static setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await Api.post('/auth/logout', {});
                } catch (e) {
                    console.error(e);
                } finally {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
