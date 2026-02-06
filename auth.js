// auth.js - Simplified for debugging
console.log('🔐 auth.js loaded');

class AuthManager {
    constructor() {
        console.log('🔐 AuthManager starting...');
        this.init();
    }

    async init() {
        // Check API health first
        console.log('🌐 Checking API health...');
        const isHealthy = await api.checkHealth();
        console.log('API healthy:', isHealthy);
        
        if (!isHealthy) {
            this.showError('API сервер недоступен');
            return;
        }
        
        // Check if user is authenticated
        if (api.isAuthenticated()) {
            console.log('✅ Token found, validating...');
            try {
                const user = await api.getCurrentUser();
                console.log('✅ User authenticated:', user);
                this.showApp();
            } catch (error) {
                console.error('❌ Token invalid:', error);
                api.clearAuthData();
                this.showAuth();
            }
        } else {
            console.log('👤 No token found');
            this.showAuth();
        }
    }

    showError(message) {
        const container = document.getElementById('auth-container');
        container.innerHTML = `
            <div class="auth-screen">
                <div class="auth-card">
                    <h2 class="auth-title">⚠️ Ошибка</h2>
                    <p style="color: rgba(255,255,255,0.8); text-align: center; margin: 20px 0;">
                        ${message}
                    </p>
                    <button onclick="location.reload()" class="auth-button">
                        Перезагрузить
                    </button>
                </div>
            </div>
        `;
    }

    showAuth() {
        console.log('Showing auth screen');
        const container = document.getElementById('auth-container');
        
        container.innerHTML = `
            <div class="auth-screen">
                <div class="auth-card">
                    <h2 class="auth-title" id="authTitle">Вход в LVKOSP</h2>
                    
                    <form id="authForm">
                        <input type="email" class="auth-input" id="email" placeholder="Email" required>
                        <input type="password" class="auth-input" id="password" placeholder="Пароль" required>
                        
                        <div id="registerFields" style="display: none;">
                            <input type="text" class="auth-input" id="username" placeholder="Имя пользователя">
                            <input type="text" class="auth-input" id="full_name" placeholder="Полное имя">
                        </div>
                        
                        <button type="submit" class="auth-button" id="submitBtn">Войти</button>
                    </form>
                    
                    <div class="auth-switch">
                        <span id="switchText">Нет аккаунта? </span>
                        <a id="switchLink">Зарегистрироваться</a>
                    </div>
                    
                    <div class="auth-message" id="authMessage"></div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center;">
                            API: ${API_BASE_URL}
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        this.bindAuthEvents();
    }

    bindAuthEvents() {
        let isLoginMode = true;
        const form = document.getElementById('authForm');
        const switchLink = document.getElementById('switchLink');
        const switchText = document.getElementById('switchText');
        const authTitle = document.getElementById('authTitle');
        const registerFields = document.getElementById('registerFields');
        const submitBtn = document.getElementById('submitBtn');
        const messageEl = document.getElementById('authMessage');
        
        // Remove required attribute for debugging
        document.getElementById('username')?.removeAttribute('required');
        
        // Switch between login/register
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                authTitle.textContent = 'Вход в LVKOSP';
                submitBtn.textContent = 'Войти';
                switchText.textContent = 'Нет аккаунта? ';
                switchLink.textContent = 'Зарегистрироваться';
                registerFields.style.display = 'none';
            } else {
                authTitle.textContent = 'Регистрация в LVKOSP';
                submitBtn.textContent = 'Зарегистрироваться';
                switchText.textContent = 'Уже есть аккаунт? ';
                switchLink.textContent = 'Войти';
                registerFields.style.display = 'block';
            }
            
            messageEl.style.display = 'none';
        });
        
        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                this.showMessage('Заполните все поля', 'error');
                return;
            }
            
            messageEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = isLoginMode ? 'Вход...' : 'Регистрация...';
            
            console.log(`${isLoginMode ? 'Login' : 'Register'} attempt:`, email);
            
            try {
                let result;
                
                if (isLoginMode) {
                    result = await api.login(email, password);
                    this.showMessage('Вход выполнен!', 'success');
                    
                    setTimeout(() => {
                        this.showApp();
                    }, 1000);
                } else {
                    const username = document.getElementById('username').value || email.split('@')[0];
                    const full_name = document.getElementById('full_name').value || username;
                    
                    result = await api.register(email, password, username, full_name);
                    this.showMessage('Регистрация успешна!', 'success');
                    
                    setTimeout(() => {
                        this.showApp();
                    }, 1000);
                }
                
                console.log('Auth result:', result);
            } catch (error) {
                console.error('Auth error:', error);
                this.showMessage(`Ошибка: ${error.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
            }
        });
    }

    showMessage(text, type) {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = text;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
    }

    showApp() {
        console.log('🚀 Showing app...');
        
        // Hide auth screen
        const container = document.getElementById('auth-container');
        container.innerHTML = '';
        
        // Show main app
        document.getElementById('main-app').style.display = 'grid';
        
        // Initialize messenger
        if (window.initMessenger) {
            setTimeout(() => {
                window.initMessenger();
            }, 500);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded');
    window.authManager = new AuthManager();
});