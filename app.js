// ========== КОНСТАНТЫ ==========
const API_URL = 'https://lvkosp-pt2-production.up.railway.app/api';

// ========== ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let token = localStorage.getItem('token');
let chats = [];
let currentChat = null;

// ========== API ФУНКЦИИ ==========
async function apiRequest(endpoint, options = {}) {
    const url = API_URL + endpoint;
    console.log('📡 Запрос:', endpoint);
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Ошибка ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка API:', error);
        throw error;
    }
}

// ========== АУТЕНТИФИКАЦИЯ ==========
async function register(email, password, username, full_name) {
    console.log('Регистрация:', email);
    
    try {
        // Пробуем несколько вариантов эндпоинтов
        const endpoints = [
            '/auth/register',
            '/register',
            '/user/register'
        ];
        
        let data;
        let lastError;
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(API_URL + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, username, full_name })
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log('✅ Регистрация успешна через', endpoint);
                    break;
                }
            } catch (error) {
                lastError = error;
                console.log('❌ Ошибка через', endpoint, error.message);
            }
        }
        
        if (!data) {
            throw new Error(lastError?.message || 'Не удалось зарегистрироваться');
        }
        
        if (data.access_token) {
            token = data.access_token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showMessage('Регистрация успешна!', 'success');
            showApp();
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('Ошибка: ' + error.message, 'error');
        throw error;
    }
}

async function login(email, password) {
    console.log('Вход:', email);
    
    try {
        // Пробуем несколько вариантов эндпоинтов
        const endpoints = [
            '/auth/login',
            '/login',
            '/user/login'
        ];
        
        let data;
        let lastError;
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(API_URL + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log('✅ Вход успешен через', endpoint);
                    break;
                }
            } catch (error) {
                lastError = error;
                console.log('❌ Ошибка через', endpoint, error.message);
            }
        }
        
        if (!data) {
            throw new Error(lastError?.message || 'Не удалось войти');
        }
        
        if (data.access_token) {
            token = data.access_token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showMessage('Вход выполнен!', 'success');
            showApp();
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка входа:', error);
        showMessage('Ошибка: ' + error.message, 'error');
        throw error;
    }
}

async function getCurrentUser() {
    try {
        const data = await apiRequest('/auth/me');
        currentUser = data;
        return data;
    } catch (error) {
        console.error('Не удалось получить пользователя:', error);
        logout();
        throw error;
    }
}

async function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showAuth();
}

// ========== ЧАТЫ ==========
async function getChats() {
    try {
        const data = await apiRequest('/chats');
        chats = data || [];
        return chats;
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        chats = [];
        return [];
    }
}

async function getMessages(chatId) {
    try {
        const data = await apiRequest(`/chats/${chatId}/messages`);
        return data || [];
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        return [];
    }
}

async function sendMessage(chatId, content) {
    try {
        const data = await apiRequest(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        return data;
    } catch (error) {
        console.error('Ошибка отправки:', error);
        throw error;
    }
}

// ========== UI ФУНКЦИИ ==========
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
    }
}

function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    
    setupAuthEvents();
}

function showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'grid';
    
    initApp();
}

function setupAuthEvents() {
    let isLoginMode = true;
    const form = document.getElementById('authForm');
    const switchLink = document.getElementById('switchLink');
    const switchText = document.getElementById('switchText');
    const authTitle = document.getElementById('authTitle');
    const registerFields = document.getElementById('registerFields');
    const submitBtn = document.getElementById('submitBtn');
    const messageEl = document.getElementById('message');
    
    // Сброс
    if (form) form.reset();
    if (messageEl) messageEl.style.display = 'none';
    
    // Переключение между входом и регистрацией
    if (switchLink) {
        switchLink.onclick = (e) => {
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
        };
    }
    
    // Отправка формы
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showMessage('Заполните все поля', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = isLoginMode ? 'Вход...' : 'Регистрация...';
            
            try {
                if (isLoginMode) {
                    await login(email, password);
                } else {
                    const username = document.getElementById('username').value || email.split('@')[0];
                    const full_name = document.getElementById('full_name').value || username;
                    await register(email, password, username, full_name);
                }
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
            }
        };
    }
}

async function initApp() {
    console.log('🚀 Запуск приложения...');
    
    try {
        // Получаем текущего пользователя
        await getCurrentUser();
        
        // Обновляем информацию о пользователе
        updateUserInfo();
        
        // Загружаем чаты
        await loadChats();
        
        // Настраиваем события
        setupAppEvents();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showMessage('Ошибка загрузки', 'error');
    }
}

function updateUserInfo() {
    if (currentUser) {
        const meName = document.getElementById('meName');
        const meUser = document.getElementById('meUser');
        
        if (meName) meName.textContent = currentUser.full_name || currentUser.email?.split('@')[0] || 'User';
        if (meUser) meUser.textContent = `@${currentUser.username || currentUser.email?.split('@')[0] || 'user'}`;
    }
}

async function loadChats() {
    const dmList = document.getElementById('dmList');
    if (!dmList) return;
    
    dmList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">Загрузка...</div>';
    
    try {
        const chats = await getChats();
        
        if (chats.length === 0) {
            dmList.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: rgba(255,255,255,0.4);">
                    <div style="font-size: 16px; margin-bottom: 10px;">😴 Нет чатов</div>
                    <div style="font-size: 13px;">Начните общение с друзьями</div>
                </div>
            `;
            return;
        }
        
        dmList.innerHTML = '';
        
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'dmItem';
            item.innerHTML = `
                <div class="dmAvatar"></div>
                <div class="dmMeta">
                    <div class="dmName">${chat.name || 'Unknown'}</div>
                    <div class="dmSnippet">${chat.snippet || 'Нет сообщений'}</div>
                </div>
                <div class="dmRight">
                    <div class="dmTime">${chat.time || ''}</div>
                    <div class="dmDot"></div>
                </div>
            `;
            
            item.onclick = () => selectChat(chat);
            dmList.appendChild(item);
        });
        
        if (chats.length > 0) {
            selectChat(chats[0]);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        dmList.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Ошибка загрузки</div>';
    }
}

async function selectChat(chat) {
    console.log('Выбран чат:', chat);
    currentChat = chat;
    
    // Обновляем заголовок
    const activeName = document.getElementById('activeName');
    if (activeName) activeName.textContent = chat.name || 'Unknown';
    
    // Загружаем сообщения
    await loadMessages(chat.id);
}

async function loadMessages(chatId) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    
    chatBody.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">Загрузка сообщений...</div>';
    
    try {
        const messages = await getMessages(chatId);
        displayMessages(messages);
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        chatBody.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Ошибка загрузки</div>';
    }
}

function displayMessages(messages) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    
    if (!messages || messages.length === 0) {
        chatBody.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: rgba(255,255,255,0.4);">
                <div style="font-size: 16px; margin-bottom: 10px;">✉️ Нет сообщений</div>
                <div style="font-size: 13px;">Начните общение первым!</div>
            </div>
        `;
        return;
    }
    
    chatBody.innerHTML = '';
    
    messages.forEach(msg => {
        const row = document.createElement('div');
        row.className = `msgRow ${msg.who === 'me' ? 'me' : 'them'}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'msgBubble';
        bubble.textContent = msg.text || '';
        
        row.appendChild(bubble);
        chatBody.appendChild(row);
    });
    
    // Прокрутка вниз
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);
}

async function sendNewMessage() {
    if (!currentChat) {
        alert('Сначала выберите чат');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
        await sendMessage(currentChat.id, content);
        messageInput.value = '';
        
        // Обновляем сообщения
        await loadMessages(currentChat.id);
        
        // Обновляем список чатов
        await loadChats();
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert('Не удалось отправить сообщение');
    }
}

function setupAppEvents() {
    // Кнопка отправки
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = sendNewMessage;
    }
    
    // Enter в поле ввода
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendNewMessage();
            }
        };
    }
    
    // Вкладки
    const tabs = document.querySelectorAll('.tab');
    const views = document.querySelectorAll('.view');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            const tabName = tab.dataset.tab;
            
            // Обновляем активную вкладку
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');
            
            // Показываем правильный вид
            views.forEach(view => {
                view.classList.remove('is-active');
                if (view.id === `view-${tabName}`) {
                    view.classList.add('is-active');
                }
            });
        };
    });
    
    // Кнопка настроек
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            logout();
        };
    }
}

// ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========
console.log('🎯 LVKOSP Messenger запускается...');

// Проверяем токен при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен');
    
    if (token) {
        // Пробуем войти с существующим токеном
        getCurrentUser()
            .then(() => {
                console.log('✅ Пользователь аутентифицирован');
                showApp();
            })
            .catch(() => {
                console.log('❌ Токен недействителен');
                showAuth();
            });
    } else {
        console.log('👤 Токен не найден');
        showAuth();
    }
});