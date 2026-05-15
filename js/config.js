// Глобальные настройки
window.SUPABASE_URL = 'https://taliasqdcwmcvocrxpbb.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbGlhc3FkY3dtY3ZvY3J4cGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Mzc4NzMsImV4cCI6MjA5NDQxMzg3M30.bwh4fTAUDLezMvIH9pYb1JmCUqheFNYrdXTKeftCp34';

// Инициализация клиента (глобально)
window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
