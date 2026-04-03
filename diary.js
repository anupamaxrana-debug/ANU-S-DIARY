(async function() {
    const calendarEl = document.getElementById('calendar');
    const entryDateEl = document.getElementById('entry-date');
    const entryTimeEl = document.getElementById('entry-time');
    const entryTitleEl = document.getElementById('entry-title');
    const editorEl = document.getElementById('editor');
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    const saveBtn = document.getElementById('save-btn');
    let userNameEl = document.getElementById('user-name');
    if (!userNameEl) {
        userNameEl = document.createElement('div');
        userNameEl.style.display = 'none';
    }
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsEmail = document.getElementById('settings-email');
    const settingsPhone = document.getElementById('settings-phone');
    const settingsCurrentPassword = document.getElementById('settings-current-password');
    const settingsNewPassword = document.getElementById('settings-new-password');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsMessage = document.getElementById('settings-message');
    const themeSelect = document.getElementById('theme-select');

    function getCurrentUser() {
        return sessionStorage.getItem('diaryCurrentUser') || localStorage.getItem('diaryCurrentUser');
    }

    function getUsers() {
        return JSON.parse(localStorage.getItem('diaryUsers') || '{}');
    }

    function saveUsers(users) {
        localStorage.setItem('diaryUsers', JSON.stringify(users));
    }

    function clearCurrentUser() {
        sessionStorage.removeItem('diaryCurrentUser');
        localStorage.removeItem('diaryCurrentUser');
    }

    const API_BASE = (window.location.protocol === 'file:' || window.location.hostname === '')
        ? 'http://localhost:3000/api'
        : '/api';

    function getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    function clearAuthToken() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    }

    function authHeaders() {
        const token = getAuthToken();
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }

    async function apiFetch(path, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${path}`, options);
            const body = await res.json();
            if (!res.ok) {
                throw new Error(body.error || 'API error');
            }
            return body;
        } catch (err) {
            // Fallback to localStorage if backend not available
            console.warn('Backend not available, using localStorage fallback:', err.message);
            return null; // Indicate fallback needed
        }
    }

    async function loadProfile() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        const users = getUsers();
        const user = users[currentUser] || { email: '', phone: '' };

        userNameEl.textContent = currentUser;
        settingsEmail.value = user.email || '';
        settingsPhone.value = user.phone || '';
    }

    function applyTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-sepia', 'theme-pastel');
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (theme === 'sepia') {
            document.body.classList.add('theme-sepia');
        } else if (theme === 'pastel') {
            document.body.classList.add('theme-pastel');
        }
        localStorage.setItem('diaryTheme', theme);
    }

    const storedTheme = localStorage.getItem('diaryTheme') || 'default';
    themeSelect.value = storedTheme;
    applyTheme(storedTheme);

    themeSelect.addEventListener('change', function() {
        applyTheme(this.value);
    });

    function getDraftKey() {
        const date = entryDateEl.value || selectedDate;
        return `draft-${userNameEl.textContent || 'unknown'}-${date}`;
    }

    function loadDraft() {
        const draft = localStorage.getItem(getDraftKey());
        if (draft && draft.trim()) {
            editorEl.innerHTML = draft;
        }
    }

    function saveDraft() {
        localStorage.setItem(getDraftKey(), editorEl.innerHTML);
    }

    function autoSave() {
        saveEntry(false);
        saveDraft();
    }

    settingsBtn.addEventListener('click', function() {
        settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none';
    });

    settingsCloseBtn.addEventListener('click', function() {
        settingsPanel.style.display = 'none';
    });

    logoutBtn.addEventListener('click', function() {
        clearAuthToken();
        window.location.href = 'index.html';
    });

    saveAccountBtn.addEventListener('click', function() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        const users = getUsers();
        users[currentUser] = users[currentUser] || { entries: {} };
        users[currentUser].email = settingsEmail.value.trim();
        users[currentUser].phone = settingsPhone.value.trim();

        saveUsers(users);
        settingsMessage.textContent = 'Contact info saved.';
        settingsMessage.style.color = '#2f855a';
    });

    changePasswordBtn.addEventListener('click', function() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        const users = getUsers();
        const user = users[currentUser];

        const current = settingsCurrentPassword.value.trim();
        const next = settingsNewPassword.value.trim();

        if (!current || !next) {
            settingsMessage.textContent = 'Please enter current and new password.';
            settingsMessage.style.color = '#c53030';
            return;
        }
        if (!user || user.password !== current) {
            settingsMessage.textContent = 'Current password is incorrect.';
            settingsMessage.style.color = '#c53030';
            return;
        }

        user.password = next;
        users[currentUser] = user;
        saveUsers(users);

        settingsMessage.textContent = 'Password changed successfully.';
        settingsMessage.style.color = '#2f855a';
        settingsCurrentPassword.value = '';
        settingsNewPassword.value = '';
    });

    let currentDate = new Date();
    let selectedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

    async function generateCalendar(year) {
        calendarEl.innerHTML = '';
        const currentUser = getCurrentUser();
        const users = getUsers();
        const user = users[currentUser] || { entries: {} };
        const entries = user.entries || {};

            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let month = 0; month < 12; month++) {
                const monthDiv = document.createElement('div');
                monthDiv.className = 'month';
                calendarEl.appendChild(monthDiv);

                const monthTitle = document.createElement('h3');
                monthTitle.className = 'month-title';
                monthTitle.textContent = new Date(year, month).toLocaleString('default', { month: 'long' });
                monthDiv.appendChild(monthTitle);

                const monthGrid = document.createElement('div');
                monthGrid.className = 'month-grid';
                monthDiv.appendChild(monthGrid);

                daysOfWeek.forEach(day => {
                    const header = document.createElement('div');
                    header.className = 'day-header';
                    header.textContent = day;
                    monthGrid.appendChild(header);
                });

                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDay = firstDay.getDay();

                for (let i = 0; i < startDay; i++) {
                    monthGrid.appendChild(document.createElement('div'));
                }

                for (let day = 1; day <= lastDay.getDate(); day++) {
                    const dayEl = document.createElement('div');
                    dayEl.className = 'day';
                    dayEl.textContent = day;

                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    if (dateStr === selectedDate) dayEl.classList.add('selected');
                    if (dateStr === currentDate.toISOString().split('T')[0]) dayEl.classList.add('today');
                    if (entries[dateStr]) dayEl.classList.add('has-entry');

                    dayEl.addEventListener('click', async () => {
                        selectedDate = dateStr;
                        entryDateEl.value = dateStr;
                        await loadEntry(dateStr);
                        document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
                        dayEl.classList.add('selected');
                    });

                    monthGrid.appendChild(dayEl);
                }
            }
        }

    async function loadEntry(date) {
        const currentUser = getCurrentUser();
        const users = getUsers();
        const user = users[currentUser] || { entries: {} };

        const entry = (user.entries && user.entries[date]) ? user.entries[date] : null;
        if (entry) {
            entryTimeEl.value = entry.time || currentDate.toTimeString().slice(0, 5);
            entryTitleEl.value = entry.title || '';
            editorEl.innerHTML = entry.content || '';
        } else {
            entryTimeEl.value = currentDate.toTimeString().slice(0, 5);
            entryTitleEl.value = '';
            editorEl.innerHTML = '';
        }
        loadDraft();
    }

    async function saveEntry(showAlert = true) {
        const currentUser = getCurrentUser();
        const users = getUsers();
        if (!users[currentUser]) users[currentUser] = { entries: {} };

        users[currentUser].entries[selectedDate] = {
            time: entryTimeEl.value,
            title: entryTitleEl.value,
            content: editorEl.innerHTML
        };

        saveUsers(users);
        if (showAlert) {
            status.textContent = 'Entry saved!';
            setTimeout(() => { status.textContent = ''; }, 1200);
        }

        await generateCalendar(currentDate.getFullYear());
    }

    entryDateEl.addEventListener('change', async function() {
        selectedDate = this.value;
        await loadEntry(selectedDate);
    });

    saveBtn.addEventListener('click', () => saveEntry(true));

    boldBtn.addEventListener('click', () => document.execCommand('bold'));
    italicBtn.addEventListener('click', () => document.execCommand('italic'));
    underlineBtn.addEventListener('click', () => document.execCommand('underline'));

    editorEl.addEventListener('input', saveDraft);
    entryTitleEl.addEventListener('input', saveDraft);

    setInterval(autoSave, 30000);

    await loadProfile();
    await generateCalendar(currentDate.getFullYear());
    await loadEntry(selectedDate);
})();