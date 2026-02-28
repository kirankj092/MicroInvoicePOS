/**
 * auth.js - Frontend Logic for Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginStatus = document.getElementById('loginStatus');
    const regStatus = document.getElementById('regStatus');

    // Toggle between Login and Register
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: document.getElementById('regUser').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPass').value
        };

        try {
            const response = await fetch('auth_api.php?action=register', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.success) {
                showStatus(regStatus, result.message, 'success');
                setTimeout(() => showLogin.click(), 2000);
            } else {
                showStatus(regStatus, result.error, 'error');
            }
        } catch (error) {
            showStatus(regStatus, 'Registration failed. Check connection.', 'error');
        }
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: document.getElementById('loginUser').value,
            password: document.getElementById('loginPass').value
        };

        try {
            const response = await fetch('auth_api.php?action=login', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.success) {
                showStatus(loginStatus, 'Login successful! Redirecting...', 'success');
                setTimeout(() => window.location.href = 'index.html', 1000);
            } else {
                showStatus(loginStatus, result.error, 'error');
            }
        } catch (error) {
            showStatus(loginStatus, 'Login failed. Check connection.', 'error');
        }
    });

    const showStatus = (el, message, type) => {
        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';
    };
});
