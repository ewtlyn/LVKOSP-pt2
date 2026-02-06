/* LVKOSP Messenger (vanilla JS)
   - Tabs: chats / friends / profile
   - DM list: select chat, show header & messages
   - Search filter
   - Send message + persist in localStorage per chat
*/

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

  // profile view
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

// ---- Data (ты можешь заменить это на Supabase позже) ----
// В макете есть эти 3 диалога — поэтому оставил, чтобы выглядело 1:1.
// Если хочешь старт "пустой" — просто поставь [] и интерфейс останется.
const seedChats = [
  {
    id: "luca",
    name: "Luca moretti",
    snippet: "ah girl, you so...",
    time: "Now",
    online: true,
    avatarUrl: "", // вставишь свою картинку: "./assets/luca.jpg"
    profile: {
      username: "@someperson",
      bio: "LOST IN THE ECHO",
      followers: "50k followers",
      post: { text: "Who i am?", likes: "5k", comments: "10k", date: "04.02.26" },
    }
  },
  {
    id: "senior",
    name: "Senior",
    snippet: "see you later",
    time: "2m",
    online: false,
    avatarUrl: "",
    profile: {
      username: "@senior",
      bio: "…",
      followers: "—",
      post: { text: "—", likes: "—", comments: "—", date: "—" },
    }
  },
  {
    id: "evans",
    name: "Evans",
    snippet: "answer me pls",
    time: "5h",
    online: false,
    avatarUrl: "",
    profile: {
      username: "@evans",
      bio: "…",
      followers: "—",
      post: { text: "—", likes: "—", comments: "—", date: "—" },
    }
  }
];

// ---- Storage ----
const LS_KEY = "lvkosp_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function nowPill() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `Today, ${hh}:${mm}`;
}

function safeText(s) {
  return String(s ?? "").replace(/[<>&]/g, ch => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;"
  }[ch]));
}

function setAvatarVar(el, url) {
  if (url) el.style.setProperty("--img", `url("${url}")`);
  else el.style.setProperty("--img", "none");
}

function makeMessageRow(text, who = "me") {
  const row = document.createElement("div");
  row.className = `msgRow ${who === "me" ? "me" : "them"}`;
  const bubble = document.createElement("div");
  bubble.className = "msgBubble";
  bubble.innerHTML = safeText(text);
  row.appendChild(bubble);
  return row;
}

// ---- App State ----
const stored = loadState();

const state = stored ?? {
  activeTab: "chats",
  chats: seedChats,
  activeChatId: seedChats[0]?.id ?? null,
  messagesByChat: {
    // luca: [{ who:"them", text:"..." }, { who:"me", text:"..." }]
  }
};

saveState(state);

// ---- Render DM list ----
function renderDmList(filter = "") {
  const q = filter.trim().toLowerCase();
  els.dmList.innerHTML = "";

  const chats = state.chats.filter(c => {
    if (!q) return true;
    return (c.name.toLowerCase().includes(q) || (c.snippet || "").toLowerCase().includes(q));
  });

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = `dmItem ${chat.id === state.activeChatId ? "is-active" : ""}`;
    item.setAttribute("role", "option");
    item.dataset.chatId = chat.id;

    const avatar = document.createElement("div");
    avatar.className = "dmAvatar";
    setAvatarVar(avatar, chat.avatarUrl);
    item.appendChild(avatar);

    if (chat.online) {
      const online = document.createElement("div");
      online.className = "dmOnline";
      avatar.appendChild(online);
    }

    const meta = document.createElement("div");
    meta.className = "dmMeta";
    meta.innerHTML = `
      <div class="dmName">${safeText(chat.name)}</div>
      <div class="dmSnippet">${safeText(chat.snippet || "")}</div>
    `;
    item.appendChild(meta);

    const right = document.createElement("div");
    right.className = "dmRight";
    right.innerHTML = `
      <div class="dmTime">${safeText(chat.time || "")}</div>
      <div class="dmDot"></div>
    `;
    item.appendChild(right);

    item.addEventListener("click", () => {
      state.activeChatId = chat.id;
      saveState(state);
      renderDmList(els.searchInput.value);
      renderActiveChat();
      // если пользователь кликает по диалогу — показываем Chats
      setTab("chats");
    });

    els.dmList.appendChild(item);
  });
}

// ---- Active chat header + messages ----
function getActiveChat() {
  return state.chats.find(c => c.id === state.activeChatId) ?? state.chats[0] ?? null;
}

function renderActiveChat() {
  const chat = getActiveChat();
  if (!chat) return;

  // header
  els.activeName.textContent = chat.name;
  els.activeStatus.textContent = chat.online ? "Online" : "Offline";
  els.activeDot.classList.toggle("is-online", !!chat.online);
  setAvatarVar(els.activeAvatar, chat.avatarUrl);

  // date pill
  els.datePill.textContent = nowPill();

  // messages
  els.chatBody.innerHTML = "";
  const msgs = state.messagesByChat[chat.id] ?? [];
  msgs.forEach(m => els.chatBody.appendChild(makeMessageRow(m.text, m.who)));

  // autoscroll
  requestAnimationFrame(() => {
    els.chatBody.scrollTop = els.chatBody.scrollHeight;
  });

  // profile view content uses active chat too
  renderProfileFromChat(chat);
}

function renderProfileFromChat(chat) {
  const p = chat.profile || {};
  els.profileName.textContent = chat.name;
  els.profileUser.textContent = p.username || "@username";
  els.profileBio.textContent = p.bio || "";
  els.profileFollowers.textContent = p.followers || "";

  setAvatarVar(els.profileAvatar, chat.avatarUrl);
  setAvatarVar(els.postAvatar, chat.avatarUrl);

  els.postName.textContent = chat.name;
  els.postUser.textContent = p.username || "@username";
  els.postText.textContent = (p.post && p.post.text) ? p.post.text : "";
  els.postDate.textContent = (p.post && p.post.date) ? p.post.date : "";

  const likes = document.getElementById("likesCount");
  const comments = document.getElementById("commentsCount");
  if (likes) likes.textContent = (p.post && p.post.likes) ? p.post.likes : "";
  if (comments) comments.textContent = (p.post && p.post.comments) ? p.post.comments : "";
}

// ---- Send message ----
function sendMessage() {
  const chat = getActiveChat();
  if (!chat) return;

  const text = (els.messageInput.value || "").trim();
  if (!text) return;

  const arr = state.messagesByChat[chat.id] ?? [];
  arr.push({ who: "me", text });
  state.messagesByChat[chat.id] = arr;

  // обновим snippet как в мессенджере
  chat.snippet = text;
  chat.time = "Now";

  els.messageInput.value = "";
  saveState(state);

  renderDmList(els.searchInput.value);
  renderActiveChat();
}

els.sendBtn.addEventListener("click", sendMessage);
els.messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ---- Tabs ----
function setTab(tab) {
  state.activeTab = tab;
  saveState(state);

  els.tabs.forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
  els.views.forEach(v => v.classList.toggle("is-active", v.dataset.view === tab));

  // Когда открываем profile — показываем профиль активного чата, как на макете
  if (tab === "profile") {
    const chat = getActiveChat();
    if (chat) renderProfileFromChat(chat);
  }
}

els.tabs.forEach(btn => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

// ---- Search ----
els.searchInput.addEventListener("input", (e) => {
  renderDmList(e.target.value);
});

// ---- Profile buttons (минимальная логика) ----
els.friendBtn.addEventListener("click", () => {
  // Можно расширить: toggle friend status
  els.friendBtn.textContent = "Ваш друг";
});
els.removeBtn.addEventListener("click", () => {
  // Минимально: удалить чат из списка
  const chat = getActiveChat();
  if (!chat) return;

  state.chats = state.chats.filter(c => c.id !== chat.id);
  delete state.messagesByChat[chat.id];

  state.activeChatId = state.chats[0]?.id ?? null;
  saveState(state);

  renderDmList(els.searchInput.value);
  renderActiveChat();
  setTab("chats");
});

// ---- Init ----
renderDmList("");
renderActiveChat();
setTab(state.activeTab || "chats");
