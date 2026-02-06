// auth.js - Authentication handling
class AuthManager {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🔐 AuthManager starting...');
        
        // Check if user is authenticated
        if (api.isAuthenticated()) {
            try {
                console.log('🔄 Validating token...');
                await api.getCurrentUser();
                console.log('✅ User authenticated');
                this.hideAuth();
                this.showApp();
            } catch (error) {
                console.error('❌ Invalid token:', error);
                api.logout();
                this.showAuth();
            }
        } else {
            console.log('👤 No token found');
            this.showAuth();
        }
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
                        
                        <div id="registerFields" style="display: none; margin-top: 15px;">
                            <input type="text" class="auth-input" id="username" placeholder="Имя пользователя" required>
                            <input type="text" class="auth-input" id="full_name" placeholder="Полное имя (необязательно)">
                        </div>
                        
                        <button type="submit" class="auth-button" id="submitBtn">Войти</button>
                    </form>
                    
                    <div class="auth-switch">
                        <span id="switchText">Нет аккаунта? </span>
                        <a id="switchLink">Зарегистрироваться</a>
                    </div>
                    
                    <div class="auth-message" id="authMessage"></div>
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
            
            messageEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = isLoginMode ? 'Вход...' : 'Регистрация...';
            
            try {
                if (isLoginMode) {
                    await api.login(email, password);
                    messageEl.textContent = 'Вход выполнен!';
                    messageEl.className = 'auth-message success';
                    messageEl.style.display = 'block';
                    
                    setTimeout(() => {
                        this.hideAuth();
                        this.showApp();
                    }, 1000);
                } else {
                    const username = document.getElementById('username').value;
                    const full_name = document.getElementById('full_name').value;
                    
                    await api.register(email, password, username, full_name);
                    messageEl.textContent = 'Регистрация успешна!';
                    messageEl.className = 'auth-message success';
                    messageEl.style.display = 'block';
                    
                    setTimeout(() => {
                        this.hideAuth();
                        this.showApp();
                    }, 1000);
                }
            } catch (error) {
                messageEl.textContent = `Ошибка: ${error.message}`;
                messageEl.className = 'auth-message error';
                messageEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
            }
        });
    }

    hideAuth() {
        const container = document.getElementById('auth-container');
        container.innerHTML = '';
    }

    showApp() {
        document.getElementById('main-app').style.display = 'grid';
        // Initialize messenger
        if (window.initMessenger) {
            window.initMessenger();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});