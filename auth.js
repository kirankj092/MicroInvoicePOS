/**
 * auth.js - Frontend Logic for Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth script initializing...");

    // Global Error Handler
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Auth Error:", message, "at", source, ":", lineno);
        return false;
    };

    // Elements
    const elements = {
        loginSection: document.getElementById('loginSection'),
        registerSection: document.getElementById('registerSection'),
        forgotSection: document.getElementById('forgotSection'),
        showRegister: document.getElementById('showRegister'),
        showLogin: document.getElementById('showLogin'),
        showForgot: document.getElementById('showForgot'),
        backToLogin: document.getElementById('backToLogin'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        forgotForm: document.getElementById('forgotForm'),
        loginStatus: document.getElementById('loginStatus'),
        regStatus: document.getElementById('regStatus'),
        forgotStatus: document.getElementById('forgotStatus'),
        forgotEmailStep: document.getElementById('forgotEmailStep'),
        forgotCodeStep: document.getElementById('forgotCodeStep'),
        forgotPassStep: document.getElementById('forgotPassStep'),
        verifyCodeBtn: document.getElementById('verifyCodeBtn'),
        resetPassBtn: document.getElementById('resetPassBtn')
    };

    const showStatus = (el, message, type) => {
        if (!el) return;
        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';
    };

    // Cookie Check
    if (!navigator.cookieEnabled) {
        showStatus(elements.loginStatus, "Error: Cookies are disabled in your browser. Login will not work.", "error");
    }

    // Check if already logged in
    const checkAuth = async () => {
        try {
            const response = await fetch('auth_api.php?action=check', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log("User already authenticated, redirecting...");
                    window.location.replace('index.html');
                }
            }
        } catch (e) {
            console.warn("Auth check failed", e);
        }
    };
    checkAuth();

    // Toggle Functions
    if (elements.showRegister) {
        elements.showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            elements.loginSection.classList.add('hidden');
            elements.registerSection.classList.remove('hidden');
        });
    }

    if (elements.showLogin) {
        elements.showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            elements.registerSection.classList.add('hidden');
            elements.forgotSection.classList.add('hidden');
            elements.loginSection.classList.remove('hidden');
        });
    }

    if (elements.showForgot) {
        elements.showForgot.addEventListener('click', (e) => {
            e.preventDefault();
            elements.loginSection.classList.add('hidden');
            elements.forgotSection.classList.remove('hidden');
            elements.forgotEmailStep.classList.remove('hidden');
            elements.forgotCodeStep.classList.add('hidden');
            elements.forgotPassStep.classList.add('hidden');
            if (elements.forgotStatus) elements.forgotStatus.style.display = 'none';
        });
    }

    if (elements.backToLogin) {
        elements.backToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            elements.forgotSection.classList.add('hidden');
            elements.loginSection.classList.remove('hidden');
        });
    }

    // Handle Registration
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const regUser = document.getElementById('regUser');
            const regEmail = document.getElementById('regEmail');
            const regPass = document.getElementById('regPass');
            
            if (!regUser || !regEmail || !regPass) return;

            const data = {
                username: regUser.value,
                email: regEmail.value,
                password: regPass.value
            };

            try {
                const response = await fetch('auth_api.php?action=register', {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                
                const result = await response.json();
                if (result.success) {
                    showStatus(elements.regStatus, result.message, 'success');
                    setTimeout(() => elements.showLogin.click(), 2000);
                } else {
                    showStatus(elements.regStatus, result.error, 'error');
                }
            } catch (error) {
                showStatus(elements.regStatus, 'Error: ' + error.message, 'error');
            }
        });
    }

    // Handle Login
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Login form submitted...");
            const loginUser = document.getElementById('loginUser');
            const loginPass = document.getElementById('loginPass');
            const loginBtn = elements.loginForm.querySelector('button[type="submit"]');
            
            if (!loginUser || !loginPass) return;
            if (loginBtn) loginBtn.disabled = true;

            const data = {
                username: loginUser.value,
                password: loginPass.value
            };

            try {
                const response = await fetch('auth_api.php?action=login', {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });

                const result = await response.json();
                if (result.success) {
                    showStatus(elements.loginStatus, 'Login successful! Redirecting...', 'success');
                    setTimeout(() => window.location.replace('index.html'), 500);
                } else {
                    showStatus(elements.loginStatus, result.error, 'error');
                    if (loginBtn) loginBtn.disabled = false;
                }
            } catch (error) {
                showStatus(elements.loginStatus, 'Error: ' + error.message, 'error');
                if (loginBtn) loginBtn.disabled = false;
            }
        });
    }

    // Forgot Password Flow
    if (elements.forgotForm) {
        elements.forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const forgotEmail = document.getElementById('forgotEmail');
            if (!forgotEmail) return;
            const email = forgotEmail.value;

            try {
                const response = await fetch('auth_api.php?action=forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success) {
                    showStatus(elements.forgotStatus, "Verification code sent to your email.", 'success');
                    elements.forgotEmailStep.classList.add('hidden');
                    elements.forgotCodeStep.classList.remove('hidden');
                } else {
                    showStatus(elements.forgotStatus, result.error, 'error');
                }
            } catch (error) {
                showStatus(elements.forgotStatus, 'Error: ' + error.message, 'error');
            }
        });
    }

    if (elements.verifyCodeBtn) {
        elements.verifyCodeBtn.addEventListener('click', async () => {
            const forgotEmail = document.getElementById('forgotEmail');
            const forgotCode = document.getElementById('forgotCode');
            if (!forgotEmail || !forgotCode) return;
            
            const email = forgotEmail.value;
            const code = forgotCode.value;

            if (!code) {
                showStatus(elements.forgotStatus, 'Please enter the verification code.', 'error');
                return;
            }

            try {
                const response = await fetch('auth_api.php?action=verify-code', {
                    method: 'POST',
                    body: JSON.stringify({ email, code }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success) {
                    showStatus(elements.forgotStatus, "Code verified! Enter your new password.", 'success');
                    elements.forgotCodeStep.classList.add('hidden');
                    elements.forgotPassStep.classList.remove('hidden');
                } else {
                    showStatus(elements.forgotStatus, result.error, 'error');
                }
            } catch (error) {
                showStatus(elements.forgotStatus, 'Error: ' + error.message, 'error');
            }
        });
    }

    if (elements.resetPassBtn) {
        elements.resetPassBtn.addEventListener('click', async () => {
            const forgotEmail = document.getElementById('forgotEmail');
            const forgotCode = document.getElementById('forgotCode');
            const forgotNewPass = document.getElementById('forgotNewPass');
            if (!forgotEmail || !forgotCode || !forgotNewPass) return;

            const email = forgotEmail.value;
            const code = forgotCode.value;
            const newPassword = forgotNewPass.value;

            if (!newPassword) {
                showStatus(elements.forgotStatus, 'Please enter a new password.', 'error');
                return;
            }

            try {
                const response = await fetch('auth_api.php?action=reset-password', {
                    method: 'POST',
                    body: JSON.stringify({ email, code, newPassword }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success) {
                    showStatus(elements.forgotStatus, "Password reset successful! Redirecting to login...", 'success');
                    setTimeout(() => {
                        elements.forgotSection.classList.add('hidden');
                        elements.loginSection.classList.remove('hidden');
                    }, 2000);
                } else {
                    showStatus(elements.forgotStatus, result.error, 'error');
                }
            } catch (error) {
                showStatus(elements.forgotStatus, 'Error: ' + error.message, 'error');
            }
        });
    }

    console.log("Auth script initialization complete.");
});
