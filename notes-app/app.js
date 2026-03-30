// Элементы DOM
const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');
const statusDiv = document.getElementById('status');
const statsDiv = document.getElementById('stats');

// Состояние приложения
let isOnline = navigator.onLine;

// Обновление статуса сети
function updateNetworkStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        statusDiv.textContent = '✅ Онлайн - данные синхронизируются';
        statusDiv.className = 'status online';
    } else {
        statusDiv.textContent = '📡 Офлайн - заметки сохраняются локально';
        statusDiv.className = 'status offline';
    }
}

// Загрузка заметок из localStorage
function loadNotes() {
    try {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        
        if (notes.length === 0) {
            list.innerHTML = '<li class="empty-message">📭 Пока нет заметок. Добавьте первую!</li>';
            statsDiv.textContent = 'Всего заметок: 0';
            return;
        }
        
        list.innerHTML = notes.map((note, index) => `
            <li>
                <span class="note-text">${escapeHtml(note)}</span>
                <button class="delete-btn" data-index="${index}">🗑️ Удалить</button>
            </li>
        `).join('');
        
        statsDiv.textContent = `Всего заметок: ${notes.length}`;
        
        // Добавляем обработчики удаления
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.dataset.index);
                deleteNote(index);
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки заметок:', error);
        list.innerHTML = '<li class="empty-message">❌ Ошибка загрузки заметок</li>';
    }
}

// Сохранение заметки
function addNote(text) {
    if (!text.trim()) {
        alert('Пожалуйста, введите текст заметки');
        return;
    }
    
    try {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(text.trim());
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
        
        // Очистка поля ввода
        input.value = '';
        
        // Визуальная обратная связь
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = '';
        }, 200);
        
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        alert('Не удалось сохранить заметку');
    }
}

// Удаление заметки
function deleteNote(index) {
    try {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (index >= 0 && index < notes.length) {
            notes.splice(index, 1);
            localStorage.setItem('notes', JSON.stringify(notes));
            loadNotes();
        }
    } catch (error) {
        console.error('Ошибка удаления заметки:', error);
        alert('Не удалось удалить заметку');
    }
}

// Экранирование HTML для безопасности
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработка отправки формы
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
        addNote(text);
    } else {
        input.style.borderColor = '#f5576c';
        setTimeout(() => {
            input.style.borderColor = '#e0e0e0';
        }, 1000);
    }
});

// Обработка изменения статуса сети
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Инициализация
loadNotes();
updateNetworkStatus();

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/notes-app/sw.js');
            console.log('✅ ServiceWorker зарегистрирован:', registration.scope);
            
            // Проверка манифеста
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {
                console.log('✅ Манифест подключен:', manifestLink.href);
            } else {
                console.error('❌ Манифест не найден');
            }
            
        } catch (err) {
            console.error('❌ Ошибка регистрации ServiceWorker:', err);
        }
    });
}

// Поддержка PWA установки
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📱 Можно установить приложение');
    
    // Создаем кнопку установки
    const installBtn = document.createElement('button');
    installBtn.textContent = '📱 Установить приложение';
    installBtn.className = 'install-btn';
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Пользователь ${outcome === 'accepted' ? 'установил' : 'отклонил'} приложение`);
            deferredPrompt = null;
            installBtn.remove();
        }
    };
    document.body.appendChild(installBtn);
});

// Обработка успешной установки PWA
window.addEventListener('appinstalled', (evt) => {
    console.log('✅ Приложение успешно установлено');
    const installBtn = document.querySelector('.install-btn');
    if (installBtn) installBtn.remove();
});