// auth.js - Компоненты аутентификации
class AuthModal {
    constructor() {
        this.modal = null;
        this.isLoginMode = true;
        this.init();
    }

    init() {
        // Создаем модальное окно
        this.modal = document.createElement('div');
        this.modal.className = 'auth-modal';
        this.modal.innerHTML = `
            <div class="auth-modal__overlay"></div>
            <div class="auth-modal__content">
                <div class="auth-modal__header">
                    <h2 class="auth-modal__title">LVKOSP Messenger</h2>
                    <p class="auth-modal__subtitle">Добро пожаловать в приватный мессенджер</p>
                </div>
                
                <form class="auth-form" id="authForm">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Пароль</label>
                        <input type="password" id="password" required>
                    </div>
                    
                    <div class="form-group extra-fields" id="extraFields" style="display: none;">
                        <label for="username">Имя пользователя</label>
                        <input type="text" id="username">
                        
                        <label for="full_name">Полное имя</label>
                        <input type="text" id="full_name">
                        
                        <label for="bio">Био</label>
                        <textarea id="bio" rows="2"></textarea>
                    </div>
                    
                    <div class="auth-actions">
                        <button type="submit" class="btn btn-primary" id="submitBtn">
                            Войти
                        </button>
                        <button type="button" class="btn btn-text" id="toggleModeBtn">
                            Нет аккаунта? Зарегистрироваться
                        </button>
                    </div>
                </form>
                
                <div class="auth-status" id="authStatus"></div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.bindEvents();
    }

    bindEvents() {
        const form = this.modal.querySelector('#authForm');
        const toggleBtn = this.modal.querySelector('#toggleModeBtn');
        const extraFields = this.modal.querySelector('#extraFields');
        const submitBtn = this.modal.querySelector('#submitBtn');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        toggleBtn.addEventListener('click', () => this.toggleMode());
    }

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        
        const title = this.modal.querySelector('.auth-modal__title');
        const submitBtn = this.modal.querySelector('#submitBtn');
        const toggleBtn = this.modal.querySelector('#toggleModeBtn');
        const extraFields = this.modal.querySelector('#extraFields');
        const status = this.modal.querySelector('#authStatus');
        
        status.textContent = '';
        
        if (this.isLoginMode) {
            title.textContent = 'Вход в LVKOSP';
            submitBtn.textContent = 'Войти';
            toggleBtn.textContent = 'Нет аккаунта? Зарегистрироваться';
            extraFields.style.display = 'none';
        } else {
            title.textContent = 'Регистрация в LVKOSP';
            submitBtn.textContent = 'Зарегистрироваться';
            toggleBtn.textContent = 'Уже есть аккаунт? Войти';
            extraFields.style.display = 'block';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.modal.querySelector('#email').value;
        const password = this.modal.querySelector('#password').value;
        const submitBtn = this.modal.querySelector('#submitBtn');
        const status = this.modal.querySelector('#authStatus');
        
        submitBtn.disabled = true;
        status.textContent = this.isLoginMode ? 'Вход...' : 'Регистрация...';
        status.className = 'auth-status auth-status--loading';
        
        try {
            if (this.isLoginMode) {
                const data = await api.login(email, password);
                status.textContent = 'Вход выполнен успешно!';
                status.className = 'auth-status auth-status--success';
                
                // Закрываем модалку и перезагружаем приложение
                setTimeout(() => {
                    this.hide();
                    location.reload();
                }, 1000);
            } else {
                const username = this.modal.querySelector('#username').value;
                const full_name = this.modal.querySelector('#full_name').value;
                const bio = this.modal.querySelector('#bio').value;
                
                const data = await api.register(email, password, username, full_name, bio);
                status.textContent = 'Регистрация успешна!';
                status.className = 'auth-status auth-status--success';
                
                setTimeout(() => {
                    this.hide();
                    location.reload();
                }, 1000);
            }
        } catch (error) {
            status.textContent = `Ошибка: ${error.message}`;
            status.className = 'auth-status auth-status--error';
            submitBtn.disabled = false;
        }
    }

    show() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Стили для модального окна
const authStyles = `
.auth-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
}

.auth-modal__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
}

.auth-modal__content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #0E0E0E;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 40px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.auth-modal__header {
    text-align: center;
    margin-bottom: 30px;
}

.auth-modal__title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 10px 0;
}

.auth-modal__subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin: 0;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    border-color: rgba(255, 255, 255, 0.3);
}

.auth-actions {
    margin-top: 30px;
}

.btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: #232222;
    color: rgba(255, 255, 255, 0.95);
}

.btn-primary:hover {
    background: #2a2929;
    transform: translateY(-1px);
}

.btn-text {
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 10px;
}

.btn-text:hover {
    color: rgba(255, 255, 255, 0.9);
}

.auth-status {
    margin-top: 20px;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    display: none;
}

.auth-status--loading {
    display: block;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
}

.auth-status--success {
    display: block;
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.2);
}

.auth-status--error {
    display: block;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
}
`;

// Добавляем стили
const styleSheet = document.createElement('style');
styleSheet.textContent = authStyles;
document.head.appendChild(styleSheet);

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем аутентификацию
    if (!api.isAuthenticated()) {
        const authModal = new AuthModal();
        authModal.show();
    }
});