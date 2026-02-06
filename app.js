// app.js - минимальная рабочая версия
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App started');
    
    // Сначала проверим доступность API
    const isApiAlive = await api.checkHealth();
    console.log('API alive:', isApiAlive);
    
    if (!isApiAlive) {
        showError('API сервер недоступен. Попробуйте позже.');
        return;
    }
    
    // Проверяем аутентификацию
    if (!api.isAuthenticated()) {
        showAuthScreen();
        return;
    }
    
    // Проверяем токен
    try {
        await api.getCurrentUser();
        initMessenger();
    } catch (error) {
        console.log('Token invalid, showing auth');
        showAuthScreen();
    }
});

function showError(message) {
    document.body.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #070707;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: sans-serif;
        ">
            <div style="
                background: #0E0E0E;
                padding: 30px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.1);
                max-width: 400px;
                text-align: center;
            ">
                <h2 style="color: #ef4444; margin: 0 0 15px 0;">Ошибка</h2>
                <p style="color: rgba(255,255,255,0.8); margin: 0 0 20px 0;">${message}</p>
                <button onclick="location.reload()" style="
                    background: #232222;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    Перезагрузить
                </button>
            </div>
        </div>
    `;
}

function showAuthScreen() {
    document.body.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(1200px 800px at 70% 20%, rgba(255,255,255,.06), transparent 60%),
                      radial-gradient(900px 700px at 10% 80%, rgba(255,255,255,.05), transparent 55%),
                      #070707;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: sans-serif;
        ">
            <div style="
                background: #0E0E0E;
                padding: 40px;
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.1);
                width: 90%;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <h1 style="color: white; text-align: center; margin: 0 0 30px 0;">LVKOSP Messenger</h1>
                
                <form id="authForm" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <input type="email" id="email" placeholder="Email" required style="
                            width: 100%;
                            padding: 14px;
                            background: rgba(255,255,255,0.03);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 10px;
                            color: white;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div>
                        <input type="password" id="password" placeholder="Пароль" required style="
                            width: 100%;
                            padding: 14px;
                            background: rgba(255,255,255,0.03);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 10px;
                            color: white;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <button type="submit" style="
                        width: 100%;
                        padding: 14px;
                        background: #232222;
                        border: none;
                        border-radius: 10px;
                        color: white;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#2a2929'" onmouseout="this.style.background='#232222'">
                        Войти
                    </button>
                    
                    <div style="text-align: center; margin-top: 10px;">
                        <a href="#" id="showRegister" style="
                            color: rgba(255,255,255,0.6);
                            text-decoration: none;
                            font-size: 14px;
                        ">Нет аккаунта? Зарегистрироваться</a>
                    </div>
                </form>
                
                <div id="registerForm" style="display: none; flex-direction: column; gap: 15px; margin-top: 20px;">
                    <input type="text" id="username" placeholder="Имя пользователя" style="
                        width: 100%;
                        padding: 14px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 10px;
                        color: white;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    
                    <input type="text" id="full_name" placeholder="Полное имя (необязательно)" style="
                        width: 100%;
                        padding: 14px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 10px;
                        color: white;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    
                    <button id="registerBtn" style="
                        width: 100%;
                        padding: 14px;
                        background: #232222;
                        border: none;
                        border-radius: 10px;
                        color: white;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#2a2929'" onmouseout="this.style.background='#232222'">
                        Зарегистрироваться
                    </button>
                    
                    <div style="text-align: center;">
                        <a href="#" id="showLogin" style="
                            color: rgba(255,255,255,0.6);
                            text-decoration: none;
                            font-size: 14px;
                        ">Уже есть аккаунт? Войти</a>
                    </div>
                </div>
                
                <div id="message" style="
                    margin-top: 20px;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    display: none;
                "></div>
            </div>
        </div>
    `;
    
    // Обработчики событий
    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const message = document.getElementById('message');
        
        message.style.display = 'none';
        
        try {
            const data = await api.login(email, password);
            message.textContent = 'Вход успешен!';
            message.style.background = 'rgba(34, 197, 94, 0.1)';
            message.style.color = '#22c55e';
            message.style.display = 'block';
            
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            message.textContent = 'Ошибка: ' + error.message;
            message.style.background = 'rgba(239, 68, 68, 0.1)';
            message.style.color = '#ef4444';
            message.style.display = 'block';
        }
    });
    
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('authForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'flex';
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authForm').style.display = 'flex';
    });
    
    document.getElementById('registerBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        const full_name = document.getElementById('full_name').value;
        const message = document.getElementById('message');
        
        if (!username) {
            message.textContent = 'Введите имя пользователя';
            message.style.background = 'rgba(239, 68, 68, 0.1)';
            message.style.color = '#ef4444';
            message.style.display = 'block';
            return;
        }
        
        message.style.display = 'none';
        
        try {
            const data = await api.register(email, password, username, full_name, '');
            message.textContent = 'Регистрация успешна!';
            message.style.background = 'rgba(34, 197, 94, 0.1)';
            message.style.color = '#22c55e';
            message.style.display = 'block';
            
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            message.textContent = 'Ошибка: ' + error.message;
            message.style.background = 'rgba(239, 68, 68, 0.1)';
            message.style.color = '#ef4444';
            message.style.display = 'block';
        }
    });
}

async function initMessenger() {
    console.log('Initializing messenger...');
    
    // Загружаем чаты
    const chats = await api.getChats();
    console.log('Loaded chats:', chats);
    
    // Показываем оригинальный интерфейс
    document.body.innerHTML = `
        <div class="app" id="app">
            <!-- Ваш оригинальный HTML код из index.html -->
            ${document.querySelector('.app').innerHTML}
        </div>
    `;
    
    // Инициализируем мессенджер
    setupMessenger(chats);
}

function setupMessenger(chats) {
    const dmList = document.getElementById('dmList');
    const chatBody = document.getElementById('chatBody');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    let activeChatId = chats[0]?.id;
    
    // Заполняем список чатов
    function renderChats() {
        dmList.innerHTML = '';
        
        if (chats.length === 0) {
            dmList.innerHTML = '<div style="padding: 20px; color: rgba(255,255,255,0.5); text-align: center;">Нет чатов</div>';
            return;
        }
        
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `dmItem ${chat.id === activeChatId ? 'is-active' : ''}`;
            item.innerHTML = `
                <div class="dmAvatar" style="${chat.avatar_url ? `--img: url('${chat.avatar_url}')` : ''}"></div>
                <div class="dmMeta">
                    <div class="dmName">${escapeHtml(chat.name)}</div>
                    <div class="dmSnippet">${escapeHtml(chat.snippet || 'Нет сообщений')}</div>
                </div>
                <div class="dmRight">
                    <div class="dmTime">${escapeHtml(chat.time || '')}</div>
                    <div class="dmDot"></div>
                </div>
            `;
            
            item.addEventListener('click', async () => {
                activeChatId = chat.id;
                renderChats();
                await loadChatMessages(chat.id);
            });
            
            dmList.appendChild(item);
        });
    }
    
    // Загружаем сообщения чата
    async function loadChatMessages(chatId) {
        chatBody.innerHTML = '<div style="padding: 20px; color: rgba(255,255,255,0.5); text-align: center;">Загрузка...</div>';
        
        try {
            const messages = await api.getMessages(chatId);
            renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
            chatBody.innerHTML = '<div style="padding: 20px; color: #ef4444; text-align: center;">Ошибка загрузки сообщений</div>';
        }
    }
    
    // Отображаем сообщения
    function renderMessages(messages) {
        chatBody.innerHTML = '';
        
        if (messages.length === 0) {
            chatBody.innerHTML = '<div style="padding: 20px; color: rgba(255,255,255,0.5); text-align: center;">Нет сообщений</div>';
            return;
        }
        
        messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = `msgRow ${msg.who === 'me' ? 'me' : 'them'}`;
            
            const bubble = document.createElement('div');
            bubble.className = 'msgBubble';
            bubble.textContent = msg.text;
            
            row.appendChild(bubble);
            chatBody.appendChild(row);
        });
        
        // Скроллим вниз
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 100);
    }
    
    // Отправка сообщения
    async function sendMessage() {
        if (!activeChatId) {
            alert('Выберите чат');
            return;
        }
        
        const text = messageInput.value.trim();
        if (!text) return;
        
        try {
            await api.sendMessage(activeChatId, text);
            messageInput.value = '';
            
            // Перезагружаем сообщения
            await loadChatMessages(activeChatId);
            
            // Обновляем список чатов
            chats = await api.getChats();
            renderChats();
        } catch (error) {
            alert('Ошибка отправки: ' + error.message);
        }
    }
    
    // Назначаем обработчики
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Инициализируем
    renderChats();
    if (activeChatId) {
        loadChatMessages(activeChatId);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}