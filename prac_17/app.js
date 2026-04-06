// ========== Глобальные переменные ==========
let isOnline = navigator.onLine;
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 'home';

// ========== WebSocket подключение ==========
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('✅ WebSocket подключен');
});

socket.on('taskAdded', (task) => {
    console.log('📨 Получена задача от другого клиента:', task);
    
    // Показываем уведомление
    showToastNotification('📝 Новая заметка: ' + (task.text.length > 50 ? task.text.substring(0, 50) + '...' : task.text));
    
    // Обновляем список заметок если мы на главной странице
    if (currentPage === 'home') {
        loadNotes();
    }
});

socket.on('disconnect', () => {
    console.log('❌ WebSocket отключен');
});

// ========== Класс Note ==========
class Note {
    constructor(id, text, date) {
        this.id = id;
        this.text = text;
        this.date = date || new Date().toISOString();
        this.edited = false;
        this.editedDate = null;
    }
}

// ========== Загрузка заметок ==========
function loadNotes() {
    try {
        const notesData = JSON.parse(localStorage.getItem('notes') || '[]');
        let notes = notesData.map(n => new Note(n.id, n.text, n.date));
        
        let filteredNotes = filterNotes(notes);
        
        if (searchQuery) {
            filteredNotes = filteredNotes.filter(note => 
                note.text.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        renderNotes(filteredNotes);
        updateStats(notes.length, filteredNotes.length);
    } catch (error) {
        console.error('Ошибка загрузки заметок:', error);
    }
}

function filterNotes(notes) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    switch(currentFilter) {
        case 'today':
            return notes.filter(note => new Date(note.date) >= today);
        case 'week':
            return notes.filter(note => new Date(note.date) >= weekAgo);
        default:
            return notes;
    }
}

function renderNotes(notes) {
    const container = document.getElementById('notes-container');
    if (!container) return;
    
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

// ========== Добавление заметки ==========
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
        
        // Отправляем событие через WebSocket
        if (socket && socket.connected) {
            socket.emit('newTask', { id: newNote.id, text: newNote.text });
        }
        
        loadNotes();
        
        const input = document.getElementById('note-input');
        if (input) input.value = '';
        
        showNotification('Заметка добавлена!', 'success');
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        showNotification('Не удалось сохранить заметку', 'error');
    }
}

// ========== Редактирование заметки ==========
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
        
        actionsDiv.innerHTML = `
            <button class="save-btn" onclick="saveNote('${id}')">💾 Сохранить</button>
            <button class="cancel-btn" onclick="cancelEdit('${id}')">❌ Отмена</button>
        `;
        
        noteTextDiv.style.display = 'none';
        noteCard.insertBefore(textarea, noteTextDiv.nextSibling);
        textarea.focus();
        
        window.tempTextarea = textarea;
    }
};

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

window.cancelEdit = function(id) {
    loadNotes();
};

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

// ========== Экспорт/Импорт ==========
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

function importNotes(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedNotes = JSON.parse(e.target.result);
            if (Array.isArray(importedNotes)) {
                const validNotes = importedNotes.filter(n => n.id && n.text);
                const currentNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                const mergedNotes = [...validNotes, ...currentNotes];
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

// ========== Уведомления ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        border-left: 4px solid ${type === 'success' ? '#43e97b' : type === 'error' ? '#f5576c' : '#4285f4'};
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showToastNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4285f4;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== Push уведомления ==========
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showNotification('Push уведомления не поддерживаются', 'error');
        return;
    }
    
    try {
        // Получаем публичный ключ с сервера
        const response = await fetch('/public-key');
        const data = await response.json();
        const publicKey = data.publicKey;
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        
        showNotification('🔔 Push уведомления включены!', 'success');
        console.log('✅ Подписка на push отправлена');
    } catch (err) {
        console.error('Ошибка подписки на push:', err);
        showNotification('Ошибка при включении уведомлений', 'error');
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await fetch('/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
            await subscription.unsubscribe();
            showNotification('🔕 Push уведомления отключены', 'info');
            console.log('❌ Отписка выполнена');
        }
    } catch (err) {
        console.error('Ошибка отписки:', err);
    }
}

// ========== Обновление статистики ==========
function updateStats(total, filtered) {
    const statsDiv = document.getElementById('stats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <span>📊 Всего заметок: ${total}</span>
            ${filtered !== total ? `<span>🔍 Найдено: ${filtered}</span>` : ''}
        `;
    }
}

function updateNetworkStatus() {
    isOnline = navigator.onLine;
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        if (isOnline) {
            statusDiv.textContent = '✅ Онлайн - данные синхронизируются';
            statusDiv.className = 'status online';
        } else {
            statusDiv.textContent = '📡 Офлайн - заметки сохраняются локально';
            statusDiv.className = 'status offline';
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== Навигация (App Shell) ==========
async function loadContent(page) {
    currentPage = page;
    
    try {
        const response = await fetch(`content/${page}.html`);
        const html = await response.text();
        const contentDiv = document.getElementById('app-content');
        contentDiv.innerHTML = html;
        
        if (page === 'home') {
            initHomePage();
        }
    } catch (err) {
        console.error('Ошибка загрузки страницы:', err);
        const contentDiv = document.getElementById('app-content');
        contentDiv.innerHTML = '<p class="is-center text-error">❌ Ошибка загрузки страницы</p>';
    }
}

function initHomePage() {
    // Инициализация DOM элементов
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const searchInput = document.getElementById('search-input');
    const clearAllBtn = document.getElementById('clear-all');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    
    // Загрузка заметок
    loadNotes();
    
    // Обработчики событий
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input && input.value.trim()) {
                addNote(input.value);
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            loadNotes();
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotes);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportNotes);
    }
    
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                importNotes(e.target.files[0]);
                importFile.value = '';
            }
        });
    }
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadNotes();
        });
    });
}

// ========== Инициализация Push кнопок ==========
async function initPushButtons() {
    const enableBtn = document.getElementById('enable-push');
    const disableBtn = document.getElementById('disable-push');
    
    if (!enableBtn || !disableBtn) return;
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
        } else {
            enableBtn.style.display = 'inline-block';
            disableBtn.style.display = 'none';
        }
        
        enableBtn.addEventListener('click', async () => {
            if (Notification.permission === 'denied') {
                alert('Уведомления запрещены. Разрешите их в настройках браузера.');
                return;
            }
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert('Необходимо разрешить уведомления.');
                    return;
                }
            }
            await subscribeToPush();
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
        });
        
        disableBtn.addEventListener('click', async () => {
            await unsubscribeFromPush();
            disableBtn.style.display = 'none';
            enableBtn.style.display = 'inline-block';
        });
    }
}

// ========== Регистрация Service Worker ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ ServiceWorker зарегистрирован:', registration.scope);
            
            // Инициализация push кнопок после регистрации SW
            await initPushButtons();
        } catch (err) {
            console.error('❌ Ошибка регистрации ServiceWorker:', err);
        }
    });
}

// ========== Навигация ==========
document.addEventListener('DOMContentLoaded', () => {
    const homeBtn = document.getElementById('home-btn');
    const aboutBtn = document.getElementById('about-btn');
    
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            homeBtn.classList.add('active');
            aboutBtn.classList.remove('active');
            loadContent('home');
        });
    }
    
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            aboutBtn.classList.add('active');
            homeBtn.classList.remove('active');
            loadContent('about');
        });
    }
    
    // Загружаем домашнюю страницу по умолчанию
    loadContent('home');
});

// ========== События сети ==========
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ========== Инициализация ==========
updateNetworkStatus();

// ========== PWA установка ==========
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
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