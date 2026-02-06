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
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
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

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearAuthData();
        }
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

    // Профиль
    async updateProfile(profileData) {
        const data = await this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        if (data.profile) {
            this.profile = data.profile;
            localStorage.setItem('lvkosp_profile', JSON.stringify(data.profile));
        }
        
        return data;
    }

    // Друзья
    async searchUsers(query) {
        return this.request(`/users/search?q=${encodeURIComponent(query)}`);
    }

    async getFriends() {
        return this.request('/friends');
    }

    async getFriendRequests() {
        return this.request('/friends/requests');
    }

    async sendFriendRequest(friendId) {
        return this.request('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ friend_id: friendId })
        });
    }

    async acceptFriendRequest(friendshipId) {
        return this.request('/friends/accept', {
            method: 'POST',
            body: JSON.stringify({ friendship_id: friendshipId })
        });
    }

    async removeFriend(friendshipId) {
        return this.request(`/friends/${friendshipId}`, {
            method: 'DELETE'
        });
    }

    // Чаты
    async getChats() {
        return this.request('/chats');
    }

    async createOrGetChat(friendId) {
        return this.request('/chats', {
            method: 'POST',
            body: JSON.stringify({ friend_id: friendId })
        });
    }

    async getMessages(chatId, limit = 50) {
        return this.request(`/chats/${chatId}/messages?limit=${limit}`);
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

// Создаем глобальный экземпляр API
window.api = new LVKOSPApi();