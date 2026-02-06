// api.js - Клиент для работы с API
const API_BASE_URL = 'lvkosp-pt2-production.up.railway.app';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('lvkosp_token');
        this.user = JSON.parse(localStorage.getItem('lvkosp_user') || 'null');
        this.profile = JSON.parse(localStorage.getItem('lvkosp_profile') || 'null');
    }

    async request(endpoint, options = {}) {
        const url = API_BASE_URL + endpoint;
        console.log(`📡 ${options.method || 'GET'} ${url}`);
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
            console.log('Using token:', this.token.substring(0, 20) + '...');
        }

        try {
            const response = await fetch(url, { ...options, headers });
            console.log(`📡 Response: ${response.status} ${response.statusText}`);
            
            // Try to get response as text first
            const responseText = await response.text();
            console.log('Response text:', responseText.substring(0, 200));
            
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('Failed to parse JSON:', responseText);
                data = { error: 'Invalid JSON response', raw: responseText };
            }
            
            if (!response.ok) {
                const errorMsg = data.error || data.message || data.details || `HTTP ${response.status}`;
                throw new Error(errorMsg);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ========== AUTH ==========
    async register(email, password, username, full_name) {
        console.log('Registering user:', { email, username });
        
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                email, 
                password, 
                username, 
                full_name,
                bio: '' 
            })
        });
        
        console.log('Register response:', data);
        
        if (data.access_token) {
            this.setAuthData(data.access_token, data.user, data.profile);
        }
        
        return data;
    }

    async login(email, password) {
        console.log('Logging in:', email);
        
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response:', data);
        
        if (data.access_token) {
            this.setAuthData(data.access_token, data.user, data.profile);
        }
        
        return data;
    }

    async getCurrentUser() {
        const data = await this.request('/auth/me');
        this.user = data.user || data;
        this.profile = data.profile || data;
        
        localStorage.setItem('lvkosp_user', JSON.stringify(this.user));
        localStorage.setItem('lvkosp_profile', JSON.stringify(this.profile));
        
        return data;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearAuthData();
        }
    }

    // ========== CHATS ==========
    async getChats() {
        try {
            const data = await this.request('/chats');
            console.log('Chats data:', data);
            return Array.isArray(data) ? data : (data.chats || []);
        } catch (error) {
            console.error('Failed to load chats:', error);
            return [];
        }
    }

    async getMessages(chatId) {
        try {
            const data = await this.request(`/chats/${chatId}/messages?limit=50`);
            return Array.isArray(data) ? data : (data.messages || []);
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

    // ========== UTILS ==========
    setAuthData(token, user, profile) {
        this.token = token;
        this.user = user;
        this.profile = profile;
        
        localStorage.setItem('lvkosp_token', token);
        localStorage.setItem('lvkosp_user', JSON.stringify(user));
        localStorage.setItem('lvkosp_profile', JSON.stringify(profile));
        
        console.log('Auth data saved');
    }

    clearAuthData() {
        this.token = null;
        this.user = null;
        this.profile = null;
        
        localStorage.removeItem('lvkosp_token');
        localStorage.removeItem('lvkosp_user');
        localStorage.removeItem('lvkosp_profile');
        
        console.log('Auth data cleared');
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ========== DEBUG ==========
    async checkHealth() {
        try {
            const response = await fetch(API_BASE_URL + '/health');
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

// Create global instance
window.api = new ApiClient();
