// Загрузка и отображение опросов
async function loadPolls() {
  const container = document.getElementById('polls-container');
  container.innerHTML = '<p>Загрузка опросов...</p>';
  
  try {
    const { data: polls, error } = await window.supabaseClient
      .from('polls')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    container.innerHTML = polls.length ? '' : '<p>Нет активных голосований</p>';
    
    for (const poll of polls) {
      container.appendChild(createPollCard(poll));
    }
    // После рендера настраиваем взаимодействие
    setupVoting();
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
