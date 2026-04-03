function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.innerText = message;
    errorElement.style.color = '#c53030';
}

function showSuccess(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.innerText = message;
    errorElement.style.color = '#2f855a';
}

function getUsers() {
    return JSON.parse(localStorage.getItem('diaryUsers') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('diaryUsers', JSON.stringify(users));
}

function setSessionUser(username, remember) {
    if (remember) {
        localStorage.setItem('diaryCurrentUser', username);
    } else {
        sessionStorage.setItem('diaryCurrentUser', username);
    }
}

function getSessionUser() {
    return sessionStorage.getItem('diaryCurrentUser') || localStorage.getItem('diaryCurrentUser');
}

function clearSessionUser() {
    sessionStorage.removeItem('diaryCurrentUser');
    localStorage.removeItem('diaryCurrentUser');
}

document.getElementById('login-btn').addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const remember = document.getElementById('remember-me').checked;

    if (!username || !password) {
        showError('Username and password required.');
        return;
    }

    const users = getUsers();
    if (!users[username]) {
        showError('User not found. Please register.');
        return;
    }

    if (users[username].password !== password) {
        showError('Wrong password. Try again.');
        return;
    }

    setSessionUser(username, remember);
    showSuccess('Login successful! Redirecting...');
    setTimeout(() => window.location.href = 'diary.html', 400);
});

document.getElementById('register-btn').addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const remember = document.getElementById('remember-me').checked;

    if (!username || !password) {
        showError('Username and password required for register.');
        return;
    }

    const users = getUsers();
    if (users[username]) {
        showError('User exists. Please login.');
        return;
    }

    users[username] = { password, email, phone, entries: {} };
    saveUsers(users);
    setSessionUser(username, remember);
    showSuccess('Registration complete! Redirecting...');
    setTimeout(() => window.location.href = 'diary.html', 400);
});

document.getElementById('forgot-btn').addEventListener('click', function () {
    const username = prompt('Enter username:');
    if (!username) return;

    const users = getUsers();
    const user = users[username];
    if (!user) {
        showError('User not found.');
        return;
    }

    const credential = prompt('Enter registered email or phone:');
    if (!credential || (credential !== user.email && credential !== user.phone)) {
        showError('Credential mismatch.');
        return;
    }

    const newPassword = prompt('Enter new password:');
    if (!newPassword) {
        showError('New password required.');
        return;
    }

    user.password = newPassword;
    users[username] = user;
    saveUsers(users);
    showSuccess('Password updated. Please login now.');
});