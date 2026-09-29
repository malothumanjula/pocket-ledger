document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // =========================
    // LOGIN
    // =========================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const btn = loginForm.querySelector('button');

            btn.disabled = true;
            btn.textContent = 'Logging in...';

            try {
                const data = await Api.post('/auth/login', {
                    email,
                    password
                });

                // Save login information
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect based on user role
                if (data.user.role === 'ADMIN') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/';
                }

            } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        });
    }

    // =========================
    // REGISTER
    // =========================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const btn = registerForm.querySelector('button');

            btn.disabled = true;
            btn.textContent = 'Registering...';

            try {
                const data = await Api.post('/auth/register', {
                    name,
                    email,
                    password
                });

                // Save login information
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // New registrations are normal users
                window.location.href = '/';

            } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }
});