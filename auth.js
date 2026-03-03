/**
 * auth.js - Frontend Logic for Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const forgotSection = document.getElementById('forgotSection');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const showForgot = document.getElementById('showForgot');
    const backToLogin = document.getElementById('backToLogin');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const loginStatus = document.getElementById('loginStatus');
    const regStatus = document.getElementById('regStatus');
    const forgotStatus = document.getElementById('forgotStatus');

    const forgotEmailStep = document.getElementById('forgotEmailStep');
    const forgotCodeStep = document.getElementById('forgotCodeStep');
    const forgotPassStep = document.getElementById('forgotPassStep');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resetPassBtn = document.getElementById('resetPassBtn');

    // Toggle between Login and Register
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        forgotSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    showForgot.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        forgotSection.classList.remove('hidden');
        forgotEmailStep.classList.remove('hidden');
        forgotCodeStep.classList.add('hidden');
        forgotPassStep.classList.add('hidden');
        forgotStatus.style.display = 'none';
    });

    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        forgotSection.classList.add('hidden');
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

    // Handle Forgot Password - Step 1: Send Code
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        try {
            const response = await fetch('auth_api.php?action=forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();

            if (result.success) {
                showStatus(forgotStatus, "Verification code sent to your email.", 'success');
                forgotEmailStep.classList.add('hidden');
                forgotCodeStep.classList.remove('hidden');
            } else {
                showStatus(forgotStatus, result.error, 'error');
            }
        } catch (error) {
            showStatus(forgotStatus, 'Error: ' + error.message, 'error');
        }
    });

    // Handle Forgot Password - Step 2: Verify Code
    verifyCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value;
        const code = document.getElementById('forgotCode').value;

        if (!code) {
            showStatus(forgotStatus, 'Please enter the verification code.', 'error');
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
                showStatus(forgotStatus, "Code verified! Enter your new password.", 'success');
                forgotCodeStep.classList.add('hidden');
                forgotPassStep.classList.remove('hidden');
            } else {
                showStatus(forgotStatus, result.error, 'error');
            }
        } catch (error) {
            showStatus(forgotStatus, 'Error: ' + error.message, 'error');
        }
    });

    // Handle Forgot Password - Step 3: Reset Password
    resetPassBtn.addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value;
        const code = document.getElementById('forgotCode').value;
        const newPassword = document.getElementById('forgotNewPass').value;

        if (!newPassword) {
            showStatus(forgotStatus, 'Please enter a new password.', 'error');
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
                showStatus(forgotStatus, "Password reset successful! Redirecting to login...", 'success');
                setTimeout(() => {
                    forgotSection.classList.add('hidden');
                    loginSection.classList.remove('hidden');
                }, 2000);
            } else {
                showStatus(forgotStatus, result.error, 'error');
            }
        } catch (error) {
            showStatus(forgotStatus, 'Error: ' + error.message, 'error');
        }
    });

    const showStatus = (el, message, type) => {
        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';
    };
});
