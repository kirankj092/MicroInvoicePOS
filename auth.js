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
            
            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.details || errorMsg;
                } catch (e) {
                    const rawText = await response.text();
                    if (rawText) errorMsg = rawText.substring(0, 200);
                }
                throw new Error(errorMsg);
            }

            let result;
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON Parse Error. Raw response:', responseText);
                throw new Error("Server Error: " + responseText.substring(0, 300));
            }

            if (result.success) {
                showStatus(regStatus, result.message, 'success');
                setTimeout(() => showLogin.click(), 2000);
            } else {
                showStatus(regStatus, result.error, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showStatus(regStatus, 'Error: ' + error.message, 'error');
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

            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.details || errorMsg;
                } catch (e) {
                    const rawText = await response.text();
                    if (rawText) errorMsg = rawText.substring(0, 200);
                }
                throw new Error(errorMsg);
            }

            let result;
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON Parse Error. Raw response:', responseText);
                throw new Error("Server Error: " + responseText.substring(0, 300));
            }

            if (result.success) {
                showStatus(loginStatus, 'Login successful! Redirecting...', 'success');
                setTimeout(() => window.location.href = 'index.html', 1000);
            } else {
                showStatus(loginStatus, result.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showStatus(loginStatus, 'Error: ' + error.message, 'error');
        }
    });

    const showStatus = (el, message, type) => {
        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';
    };
});
