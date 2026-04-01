// DOM элементы
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const statusDiv = document.getElementById('status');

// Состояние приложения
let isOnline = navigator.onLine;
let currentFilter = 'all';
let searchQuery = '';

// WebSocket подключение
const socket = io('https://localhost:3001');

// VAPID публичный ключ (замените на свой)
const VAPID_PUBLIC_KEY = 'ВАШ_ПУБЛИЧНЫЙ_VAPID_КЛЮЧ';

// Переключение активной вкладки
function setActiveButton(activeId) {
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

// Загрузка контента
async function loadContent(page) {
    try {
        const response = await fetch(`/prac_15/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;
        
        if (page === 'home') {
            initNotes();
            initPushButtons();
        }
    } catch (err) {
        contentDiv.innerHTML = '<p class="is-center text-error">❌ Ошибка загрузки страницы.</p>';
        console.error(err);
    }
}

// Инициализация функционала заметок
function initNotes() {
    // Элементы
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const list = document.getElementById('notes-list');
    const statsDiv = document.getElementById('stats');
    const searchInput = document.getElementById('search-input');
    const clearAllBtn = document.getElementById('clear-all');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    
    if (!form) return;
    
    // Класс заметки
    class Note {
        constructor(id, text, date) {
            this.id = id;
            this.text = text;
            this.date = date || new Date().toISOString();
            this.edited = false;
            this.editedDate = null;
        }
    }
    
    // Загрузка заметок
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
            showNotification('Ошибка загрузки заметок', 'error');
        }
    }
    
    // Фильтрация
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
    
    // Рендер заметок
    function renderNotes(notes) {
        if (!list) return;
        
        if (notes.length === 0) {
            list.innerHTML = '<li class="empty-message">📭 Нет заметок. Добавьте первую!</li>';
            return;
        }
        
        list.innerHTML = notes.map(note => `
            <li style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; animation: slideIn 0.3s ease;">
                <div style="flex: 1;">
                    <div style="font-size: 11px; color: #999; margin-bottom: 5px;">
                        📅 ${formatDate(note.date)}
                        ${note.edited ? '<span style="margin-left: 10px;">✏️ редактировано</span>' : ''}
                    </div>
                    <div class="note-text" id="text-${note.id}">${escapeHtml(note.text)}</div>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" onclick="window.editNote('${note.id}')">✏️</button>
                    <button class="delete-btn" onclick="window.deleteNote('${note.id}')">🗑️</button>
                </div>
            </li>
        `).join('');
    }
    
    // Форматирование даты
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (date >= today) {
            return `Сегодня в ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`;
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
            
            input.value = '';
            
            // Отправка события через WebSocket
            socket.emit('newTask', { id: newNote.id, text: newNote.text, date: newNote.date });
            
            showNotification('Заметка добавлена!', 'success');
        } catch (error) {
            console.error('Ошибка сохранения заметки:', error);
            showNotification('Не удалось сохранить заметку', 'error');
        }
    }
    
    // Редактирование
    window.editNote = function(id) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const note = notes.find(n => n.id === id);
        
        if (note) {
            const noteItem = document.querySelector(`li:has(#text-${id})`);
            const noteTextDiv = document.getElementById(`text-${id}`);
            
            const textarea = document.createElement('textarea');
            textarea.value = note.text;
            textarea.className = 'edit-textarea';
            textarea.rows = 3;
            
            const actionsDiv = noteItem.querySelector('.note-actions');
            const originalHtml = actionsDiv.innerHTML;
            
            actionsDiv.innerHTML = `
                <button class="save-btn" onclick="window.saveNote('${id}')">💾</button>
                <button class="cancel-btn" onclick="window.cancelEdit('${id}')">❌</button>
            `;
            
            noteTextDiv.style.display = 'none';
            noteItem.insertBefore(textarea, noteTextDiv.nextSibling);
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
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const filteredNotes = notes.filter(n => n.id !== id);
            localStorage.setItem('notes', JSON.stringify(filteredNotes));
            loadNotes();
            showNotification('Заметка удалена', 'info');
        }
    };
    
    function clearAllNotes() {
        if (confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ заметки. Продолжить?')) {
            localStorage.setItem('notes', '[]');
            loadNotes();
            showNotification('Все заметки удалены', 'info');
        }
    }
    
    function exportNotes() {
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
    }
    
    function importNotes(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedNotes = JSON.parse(e.target.result);
                if (Array.isArray(importedNotes)) {
                    const currentNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                    const mergedNotes = [...importedNotes, ...currentNotes];
                    const uniqueNotes = Array.from(new Map(mergedNotes.map(n => [n.id, n])).values());
                    localStorage.setItem('notes', JSON.stringify(uniqueNotes));
                    loadNotes();
                    showNotification(`Импортировано ${importedNotes.length} заметок!`, 'success');
                } else {
                    throw new Error('Неверный формат файла');
                }
            } catch (error) {
                showNotification('Ошибка импорта: неверный формат файла', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    function updateStats(total, filtered) {
        if (statsDiv) {
            statsDiv.innerHTML = `
                <span>📊 Всего заметок: ${total}</span>
                ${filtered !== total ? `<span>🔍 Найдено: ${filtered}</span>` : ''}
            `;
        }
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Обработчики событий
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addNote(input.value);
        });
    }
    
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllNotes);
    if (exportBtn) exportBtn.addEventListener('click', exportNotes);
    if (importBtn) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importNotes(e.target.files[0]);
            importFile.value = '';
        }
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            loadNotes();
        });
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadNotes();
        });
    });
    
    // WebSocket обработчик
    socket.on('taskAdded', (task) => {
        console.log('Задача от другого клиента:', task);
        showNotification(`Новая задача: ${task.text}`, 'info');
        loadNotes();
    });
    
    loadNotes();
}

// Инициализация кнопок push-уведомлений
function initPushButtons() {
    const enableBtn = document.getElementById('enable-push');
    const disableBtn = document.getElementById('disable-push');
    
    if (!enableBtn || !disableBtn) return;
    
    // Проверяем существующую подписку
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(subscription => {
                if (subscription) {
                    enableBtn.style.display = 'none';
                    disableBtn.style.display = 'inline-block';
                } else {
                    enableBtn.style.display = 'inline-block';
                    disableBtn.style.display = 'none';
                }
            });
        });
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

// Функция для преобразования base64 в Uint8Array
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

// Подписка на push-уведомления
async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        await fetch('https://localhost:3001/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        
        console.log('Подписка на push отправлена');
    } catch (err) {
        console.error('Ошибка подписки на push:', err);
    }
}

// Отписка от push-уведомлений
async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
        await fetch('https://localhost:3001/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
        console.log('Отписка выполнена');
    }
}

// Обновление статуса сети
function updateNetworkStatus() {
    isOnline = navigator.onLine;
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

// Навигация
homeBtn.addEventListener('click', () => {
    setActiveButton('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveButton('about-btn');
    loadContent('about');
});

// Обработчики сети
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Инициализация
updateNetworkStatus();
loadContent('home');

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/prac_15/sw.js');
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
    const installBtn = document.querySelector('.install-btn');
    if (installBtn) installBtn.remove();
});