require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://your-frontend-domain.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Supabase клиент
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Middleware для аутентификации
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Неверный токен' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Ошибка аутентификации' });
  }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ========== АУТЕНТИФИКАЦИЯ ==========

// Проверка статуса сервера
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    supabase: !!supabaseUrl 
  });
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, full_name, bio } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, пароль и имя пользователя обязательны' });
    }

    // Проверяем, существует ли username
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Имя пользователя уже занято' });
    }

    // Регистрация в Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: full_name || username,
          bio: bio || ''
        }
      }
    });

    if (authError) {
      console.error('Signup error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Автоматический логин после регистрации
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      console.error('Auto-login error:', loginError);
      // Продолжаем даже если авто-логин не удался
    }

    // Получаем созданный профиль
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user?.id || sessionData?.user?.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    res.status(201).json({
      message: 'Регистрация успешна',
      user: authData.user || sessionData?.user,
      profile: profile || { username, full_name: full_name || username, bio: bio || '' },
      access_token: sessionData?.session?.access_token || null
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Логин
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Получаем профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Вход выполнен успешно',
      access_token: data.session.access_token,
      user: data.user,
      profile: profile || {}
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Выход
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    res.json({ message: 'Выход выполнен успешно' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ошибка при выходе' });
  }
});

// Получить текущий профиль
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// ========== ПРОФИЛЬ ==========

// Обновить профиль
app.put('/api/profile', authenticate, async (req, res) => {
  try {
    const { full_name, bio, avatar_url } = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name,
        bio,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Профиль обновлен', profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// ========== ПОИСК И ДРУЗЬЯ ==========

// Поиск пользователей
app.get('/api/users/search', authenticate, async (req, res) => {
  try {
    const query = req.query.q || '';
    
    if (query.length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', req.user.id)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Проверяем статус дружбы для каждого пользователя
    const usersWithStatus = await Promise.all(
      data.map(async (user) => {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status, id')
          .or(`and(user_id.eq.${req.user.id},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${req.user.id})`)
          .single();

        return {
          ...user,
          friendship_status: friendship?.status || null,
          friendship_id: friendship?.id || null
        };
      })
    );

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Ошибка поиска пользователей' });
  }
});

// Получить список друзей
app.get('/api/friends', authenticate, async (req, res) => {
  try {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${req.user.id},friend_id.eq.${req.user.id}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // Преобразуем в список друзей
    const friends = friendships.map(f => {
      const isUserSender = f.user_id === req.user.id;
      return {
        ...(isUserSender ? f.friend : f.user_id),
        friendship_id: f.id
      };
    }).filter(f => f.id !== req.user.id);

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Ошибка получения списка друзей' });
  }
});

// Отправить запрос в друзья
app.post('/api/friends/request', authenticate, async (req, res) => {
  try {
    const { friend_id } = req.body;
    
    if (!friend_id) {
      return res.status(400).json({ error: 'ID друга обязателен' });
    }

    // Проверяем, не отправили ли уже запрос
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${req.user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${req.user.id})`)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Запрос уже существует' });
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert([
        {
          user_id: req.user.id,
          friend_id,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    res.json({ 
      message: 'Запрос в друзья отправлен', 
      friendship: data 
    });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Ошибка отправки запроса в друзья' });
  }
});

// Принять запрос в друзья
app.post('/api/friends/accept', authenticate, async (req, res) => {
  try {
    const { friendship_id } = req.body;
    
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendship_id)
      .eq('friend_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    
    res.json({ 
      message: 'Запрос в друзья принят', 
      friendship: data 
    });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Ошибка принятия запроса в друзья' });
  }
});

// Отклонить/удалить запрос в друзья
app.delete('/api/friends/:friendship_id', authenticate, async (req, res) => {
  try {
    const { friendship_id } = req.params;
    
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship_id);

    if (error) throw error;
    
    res.json({ message: 'Запрос в друзья удален' });
  } catch (error) {
    console.error('Delete friend error:', error);
    res.status(500).json({ error: 'Ошибка удаления запроса в друзья' });
  }
});

// Получить входящие запросы
app.get('/api/friends/requests', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user:profiles!friendships_user_id_fkey(*)
      `)
      .eq('friend_id', req.user.id)
      .eq('status', 'pending');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Ошибка получения запросов в друзья' });
  }
});

// ========== ЧАТЫ И СООБЩЕНИЯ ==========

// Создать или получить чат с другом
app.post('/api/chats', authenticate, async (req, res) => {
  try {
    const { friend_id } = req.body;
    
    if (!friend_id) {
      return res.status(400).json({ error: 'ID друга обязателен' });
    }

    // Проверяем, есть ли уже чат
    const { data: existingChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', req.user.id);

    if (existingChats.length > 0) {
      const chatIds = existingChats.map(c => c.chat_id);
      
      const { data: existingChat } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .in('chat_id', chatIds)
        .eq('user_id', friend_id)
        .single();

      if (existingChat) {
        return res.json({ 
          chat_id: existingChat.chat_id,
          message: 'Чат уже существует' 
        });
      }
    }

    // Создаем новый чат
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert([{}])
      .select()
      .single();

    if (chatError) throw chatError;

    // Добавляем участников
    await supabase
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: req.user.id },
        { chat_id: newChat.id, user_id: friend_id }
      ]);

    res.json({ 
      message: 'Чат создан',
      chat_id: newChat.id 
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Ошибка создания чата' });
  }
});

// Получить все чаты пользователя
app.get('/api/chats', authenticate, async (req, res) => {
  try {
    // Получаем все чаты пользователя
    const { data: userChats, error: userChatsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', req.user.id);

    if (userChatsError) throw userChatsError;

    if (!userChats.length) {
      return res.json([]);
    }

    const chatIds = userChats.map(uc => uc.chat_id);

    // Получаем информацию о чатах и других участниках
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`
        *,
        participants:chat_participants(
          user:profiles(*)
        ),
        last_message:messages(
          content,
          created_at,
          sender:profiles(username)
        )
      `)
      .in('id', chatIds)
      .order('last_message_at', { ascending: false });

    if (chatsError) throw chatsError;

    // Форматируем данные для фронтенда
    const formattedChats = chatsData.map(chat => {
      // Находим другого участника (не текущего пользователя)
      const otherParticipant = chat.participants
        .find(p => p.user.id !== req.user.id)?.user || 
        chat.participants[0]?.user;

      const lastMessage = chat.last_message?.[0];

      return {
        id: chat.id,
        name: otherParticipant?.full_name || 'Unknown',
        username: otherParticipant?.username || 'unknown',
        avatar_url: otherParticipant?.avatar_url || '',
        snippet: lastMessage?.content?.substring(0, 50) + (lastMessage?.content?.length > 50 ? '...' : '') || 'Нет сообщений',
        time: lastMessage ? formatTimeAgo(lastMessage.created_at) : 'Нет сообщений',
        online: false, // Здесь можно добавить логику онлайн статуса
        profile: {
          username: otherParticipant?.username || '',
          bio: otherParticipant?.bio || '',
          followers: ''
        }
      };
    });

    res.json(formattedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Ошибка получения чатов' });
  }
});

// Получить сообщения чата
app.get('/api/chats/:chat_id/messages', authenticate, async (req, res) => {
  try {
    const { chat_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // для пагинации

    // Проверяем доступ к чату
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chat_id)
      .eq('user_id', req.user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'Нет доступа к чату' });
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Форматируем сообщения для фронтенда
    const formattedMessages = data.reverse().map(msg => ({
      id: msg.id,
      who: msg.sender_id === req.user.id ? 'me' : 'them',
      text: msg.content,
      sender: {
        id: msg.sender_id,
        name: msg.sender?.full_name || 'Unknown',
        username: msg.sender?.username || 'unknown',
        avatar_url: msg.sender?.avatar_url || ''
      },
      created_at: msg.created_at,
      time: formatTimeAgo(msg.created_at)
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

// Отправить сообщение
app.post('/api/chats/:chat_id/messages', authenticate, async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    // Проверяем доступ к чату
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chat_id)
      .eq('user_id', req.user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'Нет доступа к чату' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id,
          sender_id: req.user.id,
          content: content.trim()
        }
      ])
      .select(`
        *,
        sender:profiles(*)
      `)
      .single();

    if (error) throw error;

    // Форматируем ответ
    const formattedMessage = {
      id: data.id,
      who: 'me',
      text: data.content,
      sender: {
        id: data.sender_id,
        name: data.sender?.full_name || 'Unknown',
        username: data.sender?.username || 'unknown',
        avatar_url: data.sender?.avatar_url || ''
      },
      created_at: data.created_at,
      time: formatTimeAgo(data.created_at)
    };

    res.status(201).json({
      message: 'Сообщение отправлено',
      data: formattedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// ========== НАЧАЛЬНАЯ СТРАНИЦА ==========
app.get('/', (req, res) => {
  res.json({
    message: 'LVKOSP Messenger API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      profile: {
        update: 'PUT /api/profile'
      },
      friends: {
        search: 'GET /api/users/search?q=query',
        list: 'GET /api/friends',
        requests: 'GET /api/friends/requests',
        send_request: 'POST /api/friends/request',
        accept: 'POST /api/friends/accept',
        remove: 'DELETE /api/friends/:id'
      },
      chats: {
        list: 'GET /api/chats',
        create: 'POST /api/chats',
        messages: {
          get: 'GET /api/chats/:id/messages',
          send: 'POST /api/chats/:id/messages'
        }
      }
    }
  });
});

// ========== ОБРАБОТКА ОШИБОК ==========
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`
  🚀 LVKOSP Messenger Backend запущен!
  🔗 URL: http://localhost:${PORT}
  📅 Время запуска: ${new Date().toLocaleString()}
  
  📌 Доступные эндпоинты:
  - GET  /api/health          - Проверка статуса
  - POST /api/auth/register   - Регистрация
  - POST /api/auth/login      - Вход
  - GET  /api/auth/me         - Текущий профиль
  
  ⚡ Supabase: ${supabaseUrl ? 'Подключен' : 'Не подключен'}
  `);
});