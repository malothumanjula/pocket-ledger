const API_URL = 'http://localhost:5000/api';

class Api {
    static getToken() {
        return localStorage.getItem('token');
    }

    static async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (!window.location.pathname.includes('/login.html') && !window.location.pathname.includes('/register.html')) {
                        window.location.href = '/login.html';
                    }
                }
                throw new Error(data.error || 'API request failed');
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
    static post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    static put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
    static patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); }
    static delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}
