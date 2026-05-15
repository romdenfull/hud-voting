import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { formatDate } from './utils.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function initPolls() {
  const container = document.getElementById('polls-container');

  window.addEventListener('auth-ready', loadPolls);

  async function loadPolls() {
    container.innerHTML = '<p>Загрузка опросов...</p>';
    try {
      const { data: polls, error } = await supabase
        .from('polls')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      container.innerHTML = polls.length ? '' : '<p>Нет активных голосований</p>';
      
      for (const poll of polls) {
        container.appendChild(createPollCard(poll));
      }
      // Запуск голосования после рендера
      window.dispatchEvent(new Event('polls-rendered'));
    } catch (err) {
      container.innerHTML = `<p class="error">Ошибка загрузки: ${err.message}</p>`;
    }
  }

  function createPollCard(poll) {
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
    return card;
  }
}
