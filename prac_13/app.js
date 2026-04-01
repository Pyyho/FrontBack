// Элементы DOM
const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const container = document.getElementById('notes-container');
const statusDiv = document.getElementById('status');
const statsDiv = document.getElementById('stats');
const searchInput = document.getElementById('search-input');
const clearAllBtn = document.getElementById('clear-all');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// Состояние приложения
let isOnline = navigator.onLine;
let currentFilter = 'all';
let searchQuery = '';

// Структура заметки
class Note {
    constructor(id, text, date) {
        this.id = id;
        this.text = text;
        this.date = date || new Date().toISOString();
        this.edited = false;
        this.editedDate = null;
    }
}

// Загрузка заметок из localStorage
function loadNotes() {
    try {
        const notesData = JSON.parse(localStorage.getItem('notes') || '[]');
        let notes = notesData.map(n => new Note(n.id, n.text, n.date));
        
        // Фильтрация
        let filteredNotes = filterNotes(notes);
        
        // Поиск
        if (searchQuery) {
            filteredNotes = filteredNotes.filter(note => 
                note.text.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        renderNotes(filteredNotes);
        updateStats(notes.length, filteredNotes.length);
    } catch (error) {
        console.error('Ошибка загрузки заметок:', error);
        showNotification('Ошибка загрузки заметок', 'error');
    }
}

// Фильтрация заметок
function filterNotes(notes) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    switch(currentFilter) {
        case 'today':
            return notes.filter(note => {
                const noteDate = new Date(note.date);
                return noteDate >= today;
            });
        case 'week':
            return notes.filter(note => {
                const noteDate = new Date(note.date);
                return noteDate >= weekAgo;
            });
        default:
            return notes;
    }
}

// Рендер заметок
function renderNotes(notes) {
    if (notes.length === 0) {
        container.innerHTML = '<div class="empty-message">📭 Нет заметок. Добавьте первую!</div>';
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <div class="note-date">
                <span>📅 ${formatDate(note.date)}</span>
                ${note.edited ? '<span style="color:#999;">✏️ редактировано</span>' : ''}
            </div>
            <div class="note-text" id="text-${note.id}">${escapeHtml(note.text)}</div>
            <div class="note-actions">
                <button class="edit-btn" onclick="editNote('${note.id}')">✏️ Редактировать</button>
                <button class="delete-btn" onclick="deleteNote('${note.id}')">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
        return `Сегодня в ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`;
    } else if (date >= yesterday) {
        return `Вчера в ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`;
    } else {
        return date.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
    }
}

// Добавление заметки
function addNote(text) {
    if (!text.trim()) {
        showNotification('Пожалуйста, введите текст заметки', 'error');
        return;
    }
    
    try {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = new Note(Date.now().toString(), text.trim());
        notes.unshift(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
        
        // Очистка поля ввода
        input.value = '';
        
        // Визуальная обратная связь
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = '';
        }, 200);
        
        showNotification('Заметка добавлена!', 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        showNotification('Не удалось сохранить заметку', 'error');
    }
}

// Редактирование заметки
window.editNote = function(id) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find(n => n.id === id);
    
    if (note) {
        const noteCard = document.querySelector(`.note-card[data-id="${id}"]`);
        const noteTextDiv = document.getElementById(`text-${id}`);
        
        const textarea = document.createElement('textarea');
        textarea.value = note.text;
        textarea.className = 'edit-textarea';
        textarea.rows = 4;
        
        const actionsDiv = noteCard.querySelector('.note-actions');
        const originalActions = actionsDiv.innerHTML;
        
        actionsDiv.innerHTML = `
            <button class="save-btn" onclick="saveNote('${id}')">💾 Сохранить</button>
            <button class="cancel-btn" onclick="cancelEdit('${id}', \`${escapeHtml(note.text)}\`)">❌ Отмена</button>
        `;
        
        noteTextDiv.style.display = 'none';
        noteCard.insertBefore(textarea, noteTextDiv.nextSibling);
        textarea.focus();
        
        // Сохраняем состояние
        noteCard.dataset.editing = 'true';
        window.tempTextarea = textarea;
    }
};

// Сохранение отредактированной заметки
window.saveNote = function(id) {
    const textarea = window.tempTextarea;
    const newText = textarea.value.trim();
    
    if (!newText) {
        showNotification('Заметка не может быть пустой', 'error');
        return;
    }
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex(n => n.id === id);
    
    if (noteIndex !== -1) {
        notes[noteIndex].text = newText;
        notes[noteIndex].edited = true;
        notes[noteIndex].editedDate = new Date().toISOString();
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
        showNotification('Заметка обновлена!', 'success');
    }
};

// Отмена редактирования
window.cancelEdit = function(id, originalText) {
    loadNotes();
};

// Удаление заметки
window.deleteNote = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
        try {
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const filteredNotes = notes.filter(n => n.id !== id);
            localStorage.setItem('notes', JSON.stringify(filteredNotes));
            loadNotes();
            showNotification('Заметка удалена', 'info');
        } catch (error) {
            console.error('Ошибка удаления заметки:', error);
            showNotification('Не удалось удалить заметку', 'error');
        }
    }
};

// Очистка всех заметок
function clearAllNotes() {
    if (confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ заметки. Продолжить?')) {
        try {
            localStorage.setItem('notes', '[]');
            loadNotes();
            showNotification('Все заметки удалены', 'info');
        } catch (error) {
            console.error('Ошибка очистки:', error);
            showNotification('Не удалось очистить заметки', 'error');
        }
    }
}

// Экспорт заметок
function exportNotes() {
    try {
        const notes = localStorage.getItem('notes');
        const dataStr = JSON.stringify(JSON.parse(notes || '[]'), null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `notes_backup_${new Date().toISOString().slice(0,19)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Заметки экспортированы!', 'success');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showNotification('Не удалось экспортировать заметки', 'error');
    }
}

// Импорт заметок
function importNotes(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedNotes = JSON.parse(e.target.result);
            if (Array.isArray(importedNotes)) {
                // Проверяем структуру
                const validNotes = importedNotes.filter(n => n.id && n.text);
                const currentNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                const mergedNotes = [...validNotes, ...currentNotes];
                // Удаляем дубликаты по id
                const uniqueNotes = Array.from(new Map(mergedNotes.map(n => [n.id, n])).values());
                localStorage.setItem('notes', JSON.stringify(uniqueNotes));
                loadNotes();
                showNotification(`Импортировано ${validNotes.length} заметок!`, 'success');
            } else {
                throw new Error('Неверный формат файла');
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка импорта: неверный формат файла', 'error');
        }
    };
    reader.readAsText(file);
}

// Обновление статистики
function updateStats(total, filtered) {
    statsDiv.innerHTML = `
        <span>📊 Всего заметок: ${total}</span>
        ${filtered !== total ? `<span>🔍 Найдено: ${filtered}</span>` : ''}
    `;
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> 
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

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

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчики событий
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

clearAllBtn.addEventListener('click', clearAllNotes);
exportBtn.addEventListener('click', exportNotes);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        importNotes(e.target.files[0]);
        importFile.value = '';
    }
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    loadNotes();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadNotes();
    });
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Инициализация
loadNotes();
updateNetworkStatus();

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/prac_13/sw.js');
            console.log('✅ ServiceWorker зарегистрирован:', registration.scope);
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
    
    if (!document.querySelector('.install-btn')) {
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
    }
});

window.addEventListener('appinstalled', () => {
    console.log('✅ Приложение успешно установлено');
    const installBtn = document.querySelector('.install-btn');
    if (installBtn) installBtn.remove();
});