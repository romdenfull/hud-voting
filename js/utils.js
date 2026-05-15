// Утилиты
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('ru-RU');
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
  setTimeout(() => element.classList.add('hidden'), 5000);
}

// Делаем функции глобально доступными
window.sha256 = sha256;
window.formatDate = formatDate;
window.showError = showError;
