// app.js - Main application logic
async function initMessenger() {
    console.log('🚀 Initializing messenger...');
    
    // Update user info
    updateUserInfo();
    
    // Load chats
    await loadChats();
    
    // Setup event listeners
    setupEventListeners();
}

function updateUserInfo() {
    if (api.user) {
        const meName = document.getElementById('meName');
        const meUser = document.getElementById('meUser');
        
        if (meName) meName.textContent = api.user.email?.split('@')[0] || 'User';
        if (meUser) meUser.textContent = `@${api.user.email?.split('@')[0] || 'user'}`;
    }
}

async function loadChats() {
    console.log('Loading chats...');
    const dmList = document.getElementById('dmList');
    
    if (!dmList) return;
    
    dmList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">Загрузка...</div>';
    
    try {
        const chats = await api.getChats();
        
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
                <div class="dmAvatar" style="${chat.avatar_url ? `--img: url('${chat.avatar_url}')` : ''}"></div>
                <div class="dmMeta">
                    <div class="dmName">${escapeHtml(chat.name || 'Unknown')}</div>
                    <div class="dmSnippet">${escapeHtml(chat.snippet || 'Нет сообщений')}</div>
                </div>
                <div class="dmRight">
                    <div class="dmTime">${escapeHtml(chat.time || '')}</div>
                    <div class="dmDot"></div>
                </div>
            `;
            
            item.addEventListener('click', () => selectChat(chat));
            dmList.appendChild(item);
        });
        
        // Select first chat
        if (chats.length > 0) {
            selectChat(chats[0]);
        }
    } catch (error) {
        console.error('Failed to load chats:', error);
        dmList.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Ошибка загрузки</div>';
    }
}

let currentChat = null;

async function selectChat(chat) {
    console.log('Selecting chat:', chat);
    currentChat = chat;
    
    // Update UI
    document.querySelectorAll('.dmItem').forEach(item => {
        item.classList.remove('is-active');
    });
    
    // Update chat header
    const activeName = document.getElementById('activeName');
    const activeAvatar = document.getElementById('activeAvatar');
    
    if (activeName) activeName.textContent = chat.name || 'Unknown';
    if (activeAvatar && chat.avatar_url) {
        activeAvatar.style.setProperty('--img', `url('${chat.avatar_url}')`);
    }
    
    // Update date
    const datePill = document.getElementById('datePill');
    if (datePill) {
        const now = new Date();
        datePill.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Load messages
    await loadMessages(chat.id);
}

async function loadMessages(chatId) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    
    chatBody.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">Загрузка сообщений...</div>';
    
    try {
        const messages = await api.getMessages(chatId);
        renderMessages(messages);
    } catch (error) {
        console.error('Failed to load messages:', error);
        chatBody.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Ошибка загрузки сообщений</div>';
    }
}

function renderMessages(messages) {
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
    
    // Scroll to bottom
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);
}

async function sendMessage() {
    if (!currentChat) {
        alert('Выберите чат для отправки сообщения');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
        await api.sendMessage(currentChat.id, content);
        messageInput.value = '';
        
        // Reload messages
        await loadMessages(currentChat.id);
        
        // Reload chats list to update last message
        await loadChats();
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Ошибка отправки: ' + error.message);
    }
}

function setupEventListeners() {
    // Send message button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Message input enter key
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const views = document.querySelectorAll('.view');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');
            
            // Show correct view
            views.forEach(view => {
                view.classList.remove('is-active');
                if (view.dataset.view === tabName) {
                    view.classList.add('is-active');
                }
            });
        });
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // Simple filter - in real app you would filter the list
            console.log('Search:', e.target.value);
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            alert('Настройки будут добавлены позже');
        });
    }
    
    // Logout button (add to your HTML if needed)
    // const logoutBtn = document.getElementById('logoutBtn');
    // if (logoutBtn) {
    //     logoutBtn.addEventListener('click', () => {
    //         api.logout();
    //         location.reload();
    //     });
    // }
}

// Utility function
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make function globally available
window.initMessenger = initMessenger;