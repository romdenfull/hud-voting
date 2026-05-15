// Ждём полной загрузки страницы + библиотеки
document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация клиента (только после загрузки supabase-js)
  const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

  // Утилиты
  const sha256 = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('ru-RU');
  const showError = (el, msg) => {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  };

  // DOM-элементы
  const loginSection = document.getElementById('login-section');
  const pollsSection = document.getElementById('polls-section');
  const userPanel = document.getElementById('user-panel');
  const userInfo = document.getElementById('user-info');
  const loginForm = document.getElementById('login-form');
  const codeInput = document.getElementById('code-input');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const pollsContainer = document.getElementById('polls-container');

  // Проверка сохранённой сессии
  const session = JSON.parse(localStorage.getItem('hud_session'));
  if (session) {
    showLoggedIn(session);
  }

  // Обработчик входа
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const code = codeInput.value.trim();
    if (!code) return showError(loginError, 'Введите код');

    try {
      const hash = await sha256(code);
      const { data, error } = await supabase.rpc('verify_code', { p_code_hash: hash });

      if (error || !data || data.length === 0) throw new Error('Неверный код или доступ отозван');

      const user = data[0];
      const sessionData = { codeHash: hash, ...user };
      localStorage.setItem('hud_session', JSON.stringify(sessionData));
      showLoggedIn(sessionData);
    } catch (err) {
      showError(loginError, err.message);
    }
  });

  // Выход
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('hud_session');
    location.reload();
  });

  // Показать интерфейс после входа
  function showLoggedIn(session) {
    loginSection.classList.add('hidden');
    pollsSection.classList.remove('hidden');
    userPanel.classList.remove('hidden');
    userInfo.textContent = `👤 ${session.display_name} | Вес голоса: ${session.weight}`;
    loadPolls(session);
  }

  // Загрузка опросов
  async function loadPolls(session) {
    pollsContainer.innerHTML = '<p>Загрузка опросов...</p>';
    try {
      const { data: polls, error } = await supabase
        .from('polls')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      pollsContainer.innerHTML = polls.length ? '' : '<p>Нет активных голосований</p>';
      
      for (const poll of polls) {
        pollsContainer.appendChild(createPollCard(poll, session));
      }
    } catch (err) {
      pollsContainer.innerHTML = `<p class="error">Ошибка: ${err.message}</p>`;
    }
  }

  // Создание карточки опроса
  function createPollCard(poll, session) {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `
      <h3>${poll.title}</h3>
      <p style="color:var(--muted); font-size:0.8rem; margin-bottom:0.8rem;">
        Дедлайн: ${formatDate(poll.deadline)}
      </p>
      <div id="options-${poll.id}" class="options-list"></div>
      <div id="results-${poll.id}" class="results hidden"></div>
    `;
    setupPollInteraction(poll.id, poll.options, session);
    return card;
  }

  // Настройка голосования для опроса
  async function setupPollInteraction(pollId, options, session) {
    const optionsContainer = document.getElementById(`options-${pollId}`);
    const resultsContainer = document.getElementById(`results-${pollId}`);

    // Проверка: уже голосовал?
    const { data: existingVote } = await supabase
      .from('votes')
      .select('option_index')
      .eq('poll_id', pollId)
      .eq('code_hash', session.codeHash)
      .single();

    if (existingVote) {
      renderResults(pollId, options, resultsContainer);
      optionsContainer.innerHTML = '<p style="color:var(--success); margin-top:0.5rem;">✅ Ваш голос учтён</p>';
      return;
    }

    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = '⏳ Отправка...';
        try {
          const { error } = await supabase.from('votes').insert({
            poll_id: pollId,
            code_hash: session.codeHash,
            option_index: idx,
            weight: session.weight
          });
          if (error) throw error;
          
          btn.classList.add('voted');
          btn.textContent = `✅ Выбрано (+${session.weight} балл.)`;
          renderResults(pollId, options, resultsContainer);
        } catch (err) {
          alert('Ошибка: ' + err.message);
          btn.disabled = false;
          btn.textContent = opt.text;
        }
      };
      optionsContainer.appendChild(btn);
    });
  }

  // Отрисовка результатов
  async function renderResults(pollId, options, container) {
    container.classList.remove('hidden');
    const { data: votes } = await supabase.from('votes').select('option_index, weight').eq('poll_id', pollId);
    
    if (!votes || votes.length === 0) {
      container.innerHTML = '<p style="color:var(--muted)">Пока нет голосов</p>';
      return;
    }

    const totals = options.map((_, i) => ({
      index: i,
      text: options[i].text,
      sum: votes.filter(v => v.option_index === i).reduce((acc, v) => acc + v.weight, 0)
    }));

    const maxSum = Math.max(...totals.map(t => t.sum), 1);
    container.innerHTML = totals.map(t => `
      <div class="result-text">
        <span>${t.text}</span>
        <span>${t.sum} баллов (${((t.sum / maxSum) * 100).toFixed(0)}%)</span>
      </div>
      <div class="result-bar">
        <div class="result-fill" style="width: ${(t.sum / maxSum) * 100}%"></div>
      </div>
    `).join('');
  }
});
