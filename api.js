// api.js - Клиент для работы с API
const API_BASE_URL = 'lvkosp-pt2-production.up.railway.app';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('lvkosp_token');
        this.user = JSON.parse(localStorage.getItem('lvkosp_user') || 'null');
    }

    async request(endpoint, options = {}) {
        const url = API_BASE_URL + endpoint;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.log(`📡 ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, { ...options, headers });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async register(email, password, username, full_name) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username, full_name })
        });
        
        if (data.access_token) {
            this.token = data.access_token;
            this.user = data.user;
            localStorage.setItem('lvkosp_token', this.token);
            localStorage.setItem('lvkosp_user', JSON.stringify(this.user));
        }
        
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.access_token) {
            this.token = data.access_token;
            this.user = data.user;
            localStorage.setItem('lvkosp_token', this.token);
            localStorage.setItem('lvkosp_user', JSON.stringify(this.user));
        }
        
        return data;
    }

    async getCurrentUser() {
        const data = await this.request('/auth/me');
        this.user = data;
        localStorage.setItem('lvkosp_user', JSON.stringify(data));
        return data;
    }

    // Chats
    async getChats() {
        try {
            const data = await this.request('/chats');
            console.log('Chats loaded:', data);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to load chats:', error);
            return [];
        }
    }

    async getMessages(chatId) {
        try {
            const data = await this.request(`/chats/${chatId}/messages?limit=50`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to load messages:', error);
            return [];
        }
    }

    async sendMessage(chatId, content) {
        return this.request(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    // Friends
    async searchUsers(query) {
        return this.request(`/users/search?q=${encodeURIComponent(query)}`);
    }

    async getFriends() {
        return this.request('/friends');
    }

    // Logout
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('lvkosp_token');
        localStorage.removeItem('lvkosp_user');
    }

    isAuthenticated() {
        return !!this.token;
    }
}

// Create global instance
window.api = new ApiClient();