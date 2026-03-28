// DOM элементы
const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');
const notesCountSpan = document.getElementById('notes-count');
const clearAllBtn = document.getElementById('clear-all-btn');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');

// Ключ для localStorage
const STORAGE_KEY = 'notes-app';

// Загрузка заметок из localStorage
function loadNotes() {
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    updateNotesList(notes);
    return notes;
}

// Обновление отображения списка
function updateNotesList(notes) {
    if (notes.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>📭 Нет заметок</p><p>Добавьте первую заметку выше</p></div>';
        notesCountSpan.textContent = '0 заметок';
        return;
    }
    
    list.innerHTML = notes.map((note, index) => `
        <li>
            <span class="note-text">${escapeHtml(note)}</span>
            <button class="delete-note" data-index="${index}">🗑️</button>
        </li>
    `).join('');
    
    notesCountSpan.textContent = `${notes.length} ${getPluralForm(notes.length)}`;
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deleteNote(index);
        });
    });
}

// Плюрализация
function getPluralForm(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'заметка';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'заметки';
    return 'заметок';
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Сохранение заметки
function addNote(text) {
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    notes.push(text);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    updateNotesList(notes);
    
    // Показываем уведомление (опционально)
    showToast('✅ Заметка добавлена', 'success');
}

// Удаление заметки
function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const deletedNote = notes[index];
    notes.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    updateNotesList(notes);
    showToast(`🗑️ Удалена: "${deletedNote.substring(0, 30)}..."`, 'info');
}

// Очистка всех заметок
function clearAllNotes() {
    if (confirm('⚠️ Вы уверены, что хотите удалить все заметки? Это действие нельзя отменить.')) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        updateNotesList([]);
        showToast('🗑️ Все заметки удалены', 'warning');
    }
}

// Показ уведомления
function showToast(message, type = 'info') {
    // Создаем toast элемент
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: fadeInOut 2s ease;
        white-space: nowrap;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// Обновление статуса сети
function updateNetworkStatus() {
    if (navigator.onLine) {
        statusText.textContent = 'Онлайн';
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
    } else {
        statusText.textContent = 'Офлайн (работает из кэша)';
        statusIndicator.classList.add('offline');
        statusIndicator.classList.remove('online');
        showToast('📡 Вы офлайн, но приложение работает!', 'info');
    }
}

// Обработка отправки формы
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    
    if (text) {
        addNote(text);
        input.value = '';
        input.focus();
    } else {
        showToast('⚠️ Введите текст заметки', 'warning');
    }
});

// Очистка всех заметок
clearAllBtn.addEventListener('click', clearAllNotes);

// Слушаем изменения статуса сети
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Первоначальная загрузка
loadNotes();
updateNetworkStatus();

// Добавляем стили для анимации toast
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

// ============= РЕГИСТРАЦИЯ SERVICE WORKER =============

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker зарегистрирован:', registration.scope);
            
            // Проверяем обновления
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Обнаружено обновление Service Worker');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('✅ Новый Service Worker установлен, перезагрузите страницу');
                        showToast('🔄 Обновление готово! Перезагрузите страницу', 'info');
                    }
                });
            });
        } catch (err) {
            console.error('❌ Ошибка регистрации Service Worker:', err);
        }
    });
}

// Отправка сообщения Service Worker (опционально)
if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
        type: 'CLIENT_READY',
        timestamp: Date.now()
    });
}