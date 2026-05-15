import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function initVoting() {
  window.addEventListener('polls-rendered', async () => {
    const polls = await supabase.from('polls').select('*').eq('is_active', true);
    const session = JSON.parse(localStorage.getItem('hud_session'));
    if (!session) return;

    for (const poll of polls.data) {
      await setupPollInteraction(poll.id, poll.options, session);
    }
  });

  async function setupPollInteraction(pollId, options, session) {
    const optionsContainer = document.getElementById(`options-${pollId}`);
    const resultsContainer = document.getElementById(`results-${pollId}`);
    optionsContainer.innerHTML = '';

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
}
