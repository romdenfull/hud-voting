import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { sha256, showError } from './utils.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function initAuth() {
  const form = document.getElementById('login-form');
  const input = document.getElementById('code-input');
  const errorEl = document.getElementById('login-error');
  const loginSection = document.getElementById('login-section');
  const pollsSection = document.getElementById('polls-section');
  const userPanel = document.getElementById('user-panel');
  const userInfo = document.getElementById('user-info');

  // Проверка сохранённой сессии
  const session = JSON.parse(localStorage.getItem('hud_session'));
  if (session) {
    showLoggedIn(session);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    const code = input.value.trim();
    if (!code) return showError(errorEl, 'Введите код');

    try {
      const hash = await sha256(code);
      const { data, error } = await supabase.rpc('verify_code', { p_code_hash: hash });

      if (error || !data.length) throw new Error('Неверный код или доступ отозван');

      const user = data[0];
      const sessionData = { codeHash: hash, ...user };
      localStorage.setItem('hud_session', JSON.stringify(sessionData));
      showLoggedIn(sessionData);
    } catch (err) {
      showError(errorEl, err.message);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('hud_session');
    location.reload();
  });

  function showLoggedIn(session) {
    loginSection.classList.add('hidden');
    pollsSection.classList.remove('hidden');
    userPanel.classList.remove('hidden');
    userInfo.textContent = `👤 ${session.display_name} | Вес голоса: ${session.weight}`;
    window.dispatchEvent(new Event('auth-ready'));
  }
}
