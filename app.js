/* LVKOSP Messenger (API версия) */

// Замените весь старый код на этот:

document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем аутентификацию
    if (!window.api || !api.isAuthenticated()) {
        // Покажем модалку аутентификации
        await showAuthModal();
        return;
    }

    // Получаем текущий профиль
    try {
        await api.getCurrentUser();
        initApp();
    } catch (error) {
        console.error('Failed to get user:', error);
        localStorage.clear();
        location.reload();
    }
});

async function showAuthModal() {
    // Создаем простую модалку если auth.js не загружен
    const modalHTML = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#070707;z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div style="background:#0E0E0E;padding:40px;border-radius:16px;max-width:400px;width:90%;border:1px solid rgba(255,255,255,0.1);">
                <h2 style="color:white;margin:0 0 20px 0;">Требуется вход</h2>
                <p style="color:rgba(255,255,255,0.6);margin-bottom:30px;">Пожалуйста, перезагрузите страницу и войдите в систему.</p>
                <button onclick="location.reload()" style="background:#232222;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">
                    Перезагрузить
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function initApp() {
    const els = {
        tabs: document.querySelectorAll(".tab"),
        views: document.querySelectorAll(".view"),

        dmList: document.getElementById("dmList"),
        searchInput: document.getElementById("searchInput"),

        activeAvatar: document.getElementById("activeAvatar"),
        activeName: document.getElementById("activeName"),
        activeStatus: document.getElementById("activeStatus"),
        activeDot: document.getElementById("activeDot"),
        datePill: document.getElementById("datePill"),

        chatBody: document.getElementById("chatBody"),
        messageInput: document.getElementById("messageInput"),
        sendBtn: document.getElementById("sendBtn"),

        profileAvatar: document.getElementById("profileAvatar"),
        profileName: document.getElementById("profileName"),
        profileUser: document.getElementById("profileUser"),
        profileBio: document.getElementById("profileBio"),
        profileFollowers: document.getElementById("profileFollowers"),

        postAvatar: document.getElementById("postAvatar"),
        postName: document.getElementById("postName"),
        postUser: document.getElementById("postUser"),
        postText: document.getElementById("postText"),
        postDate: document.getElementById("postDate"),

        friendBtn: document.getElementById("friendBtn"),
        removeBtn: document.getElementById("removeBtn"),
    };

    // State
    const state = {
        activeTab: "chats",
        chats: [],
        activeChatId: null,
        messagesByChat: {}
    };

    // ---- Render DM list ----
    async function renderDmList(filter = "") {
        try {
            const chats = await api.getChats();
            state.chats = chats;
            
            const q = filter.trim().toLowerCase();
            els.dmList.innerHTML = "";

            const filteredChats = chats.filter(c => {
                if (!q) return true;
                return (c.name.toLowerCase().includes(q) || 
                       (c.snippet || "").toLowerCase().includes(q));
            });

            filteredChats.forEach(chat => {
                const item = document.createElement('div');
                item.className = `dmItem ${chat.id === state.activeChatId ? "is-active" : ""}`;
                item.dataset.chatId = chat.id;

                const avatar = document.createElement('div');
                avatar.className = "dmAvatar";
                if (chat.avatar_url) {
                    avatar.style.setProperty("--img", `url("${chat.avatar_url}")`);
                }
                item.appendChild(avatar);

                const meta = document.createElement('div');
                meta.className = "dmMeta";
                meta.innerHTML = `
                    <div class="dmName">${escapeHtml(chat.name)}</div>
                    <div class="dmSnippet">${escapeHtml(chat.snippet || "")}</div>
                `;
                item.appendChild(meta);

                const right = document.createElement('div');
                right.className = "dmRight";
                right.innerHTML = `
                    <div class="dmTime">${escapeHtml(chat.time || "")}</div>
                    <div class="dmDot"></div>
                `;
                item.appendChild(right);

                item.addEventListener("click", async () => {
                    state.activeChatId = chat.id;
                    await renderActiveChat();
                    setTab("chats");
                });

                els.dmList.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading chats:', error);
            els.dmList.innerHTML = `<div class="blank" style="padding:20px;color:rgba(255,255,255,0.5);">
                Ошибка загрузки чатов
            </div>`;
        }
    }

    // ---- Active chat ----
    function getActiveChat() {
        return state.chats.find(c => c.id === state.activeChatId) || state.chats[0] || null;
    }

    async function renderActiveChat() {
        const chat = getActiveChat();
        if (!chat) {
            // Показываем заглушку если нет активного чата
            els.activeName.textContent = "Выберите чат";
            els.activeStatus.textContent = "";
            els.chatBody.innerHTML = '<div class="blank"><div class="blank__title">Выберите чат</div></div>';
            return;
        }

        // Header
        els.activeName.textContent = chat.name;
        els.activeStatus.textContent = "Online"; // TODO: real status
        setAvatarVar(els.activeAvatar, chat.avatar_url);

        // Date
        els.datePill.textContent = getCurrentTime();

        // Messages
        try {
            const messages = await api.getMessages(chat.id);
            renderMessages(messages);
            
            // Update profile view
            renderProfileFromChat(chat);
        } catch (error) {
            console.error('Error loading messages:', error);
            els.chatBody.innerHTML = '<div class="blank"><div class="blank__title">Ошибка загрузки сообщений</div></div>';
        }
    }

    function renderMessages(messages) {
        els.chatBody.innerHTML = "";
        messages.forEach(msg => {
            els.chatBody.appendChild(makeMessageRow(msg.text, msg.who));
        });
        
        // Auto-scroll
        requestAnimationFrame(() => {
            els.chatBody.scrollTop = els.chatBody.scrollHeight;
        });
    }

    // ---- Send message ----
    async function sendMessage() {
        const chat = getActiveChat();
        if (!chat) return;

        const text = (els.messageInput.value || "").trim();
        if (!text) return;

        try {
            await api.sendMessage(chat.id, text);
            els.messageInput.value = "";
            
            // Reload messages
            const messages = await api.getMessages(chat.id);
            renderMessages(messages);
            
            // Update chat list
            await renderDmList(els.searchInput.value);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Ошибка отправки сообщения');
        }
    }

    els.sendBtn.addEventListener("click", sendMessage);
    els.messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // ---- Profile ----
    function renderProfileFromChat(chat) {
        els.profileName.textContent = chat.name;
        els.profileUser.textContent = chat.username || "@username";
        els.profileBio.textContent = chat.profile?.bio || "";
        
        setAvatarVar(els.profileAvatar, chat.avatar_url);
        setAvatarVar(els.postAvatar, chat.avatar_url);
        
        els.postName.textContent = chat.name;
        els.postUser.textContent = chat.username || "@username";
    }

    // ---- Tabs ----
    function setTab(tab) {
        state.activeTab = tab;
        els.tabs.forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
        els.views.forEach(v => v.classList.toggle("is-active", v.dataset.view === tab));
    }

    els.tabs.forEach(btn => {
        btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    // ---- Search ----
    els.searchInput.addEventListener("input", (e) => {
        renderDmList(e.target.value);
    });

    // ---- Utils ----
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setAvatarVar(el, url) {
        if (url) el.style.setProperty("--img", `url("${url}")`);
        else el.style.removeProperty("--img");
    }

    function makeMessageRow(text, who = "me") {
        const row = document.createElement('div');
        row.className = `msgRow ${who === "me" ? "me" : "them"}`;
        const bubble = document.createElement('div');
        bubble.className = "msgBubble";
        bubble.textContent = text;
        row.appendChild(bubble);
        return row;
    }

    function getCurrentTime() {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `Сегодня, ${hh}:${mm}`;
    }

    // ---- Init ----
    async function initialize() {
        try {
            await renderDmList();
            
            // Если есть чаты, выбираем первый
            if (state.chats.length > 0) {
                state.activeChatId = state.chats[0].id;
                await renderActiveChat();
            }
            
            setTab(state.activeTab);
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    // Запускаем приложение
    initialize();
};