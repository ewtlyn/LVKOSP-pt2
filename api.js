// api.js - Клиент для работы с API
const API_BASE_URL = 'lvkosp-pt2-production.up.railway.app';

class LVKOSPApi {
    constructor() {
        this.token = localStorage.getItem('lvkosp_token');
        this.user = JSON.parse(localStorage.getItem('lvkosp_user') || 'null');
        this.profile = JSON.parse(localStorage.getItem('lvkosp_profile') || 'null');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`API Request: ${options.method || 'GET'} ${url}`);
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            console.log(`API Response: ${response.status} ${response.statusText}`);
            
            // Если ответ пустой (204 No Content)
            if (response.status === 204) {
                return { success: true };
            }
            
            const text = await response.text();
            let data;
            
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Failed to parse JSON:', text);
                throw new Error('Invalid JSON response');
            }
            
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Проверка доступности API
    async checkHealth() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    // Аутентификация
    async register(email, password, username, full_name, bio = '') {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username, full_name, bio })
        });

        if (data.access_token) {
            this.setAuthData(data.access_token, data.user, data.profile);
        }

        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.access_token) {
            this.setAuthData(data.access_token, data.user, data.profile);
        }

        return data;
    }

    async getCurrentUser() {
        try {
            const data = await this.request('/auth/me');
            this.profile = data;
            localStorage.setItem('lvkosp_profile', JSON.stringify(data));
            return data;
        } catch (error) {
            this.clearAuthData();
            throw error;
        }
    }

    // Чаты (самое важное для теста)
    async getChats() {
        try {
            const data = await this.request('/chats');
            console.log('Chats data:', data);
            return data || [];
        } catch (error) {
            console.error('Get chats error:', error);
            return [];
        }
    }

    async getMessages(chatId) {
        try {
            const data = await this.request(`/chats/${chatId}/messages?limit=50`);
            return data || [];
        } catch (error) {
            console.error('Get messages error:', error);
            return [];
        }
    }

    async sendMessage(chatId, content) {
        return this.request(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    // Вспомогательные методы
    setAuthData(token, user, profile) {
        this.token = token;
        this.user = user;
        this.profile = profile;
        
        localStorage.setItem('lvkosp_token', token);
        localStorage.setItem('lvkosp_user', JSON.stringify(user));
        localStorage.setItem('lvkosp_profile', JSON.stringify(profile));
    }

    clearAuthData() {
        this.token = null;
        this.user = null;
        this.profile = null;
        
        localStorage.removeItem('lvkosp_token');
        localStorage.removeItem('lvkosp_user');
        localStorage.removeItem('lvkosp_profile');
    }

    isAuthenticated() {
        return !!this.token;
    }
}

// Создаем глобальный экземпляр
window.api = new LVKOSPApi();