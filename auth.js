/**
 * auth.js - Frontend Logic for Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    // Global Error Handler for easier debugging on Hostinger
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Auth Error:", message, "at", source, ":", lineno);
        return false;
    };

    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const forgotSection = document.getElementById('forgotSection');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const showForgot = document.getElementById('showForgot');
    const backToLogin = document.getElementById('backToLogin');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Cookie Check for Mobile
    if (!navigator.cookieEnabled) {
        if (loginStatus) showStatus(loginStatus, "Error: Cookies are disabled in your browser. Login will not work.", "error");
        if (regStatus) showStatus(regStatus, "Error: Cookies are disabled in your browser.", "error");
    }
    const forgotForm = document.getElementById('forgotForm');
    const loginStatus = document.getElementById('loginStatus');
    const regStatus = document.getElementById('regStatus');

    // Check if already logged in
    const checkAuth = async () => {
        try {
            const response = await fetch('auth_api.php?action=check', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.location.replace('index.html');
                }
            }
        } catch (e) {
            console.warn("Auth check failed on login page", e);
        }
    };
    checkAuth();
    const forgotStatus = document.getElementById('forgotStatus');

    const forgotEmailStep = document.getElementById('forgotEmailStep');
    const forgotCodeStep = document.getElementById('forgotCodeStep');
    const forgotPassStep = document.getElementById('forgotPassStep');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resetPassBtn = document.getElementById('resetPassBtn');

    // Toggle between Login and Register
    if (showRegister && loginSection && registerSection) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
        });
    }

    if (showLogin && registerSection && forgotSection && loginSection) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            forgotSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        });
    }

    if (showForgot && loginSection && forgotSection && forgotEmailStep && forgotCodeStep && forgotPassStep) {
        showForgot.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.add('hidden');
            forgotSection.classList.remove('hidden');
            forgotEmailStep.classList.remove('hidden');
            forgotCodeStep.classList.add('hidden');
            forgotPassStep.classList.add('hidden');
            if (forgotStatus) forgotStatus.style.display = 'none';
        });
    }

    if (backToLogin && forgotSection && loginSection) {
        backToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            forgotSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        });
    }

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
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
            
            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.includes('db_config.php')) {
                        errorMsg = "Database configuration (db_config.php) is missing on your Hostinger server. Please create it using db_config.example.php.";
                    } else {
                        errorMsg = errorData.error || errorData.details || errorMsg;
                    }
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
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Login form submitted...");
            const loginUser = document.getElementById('loginUser');
            const loginPass = document.getElementById('loginPass');
            const loginBtn = loginForm.querySelector('button[type="submit"]');
            
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

            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.includes('db_config.php')) {
                        errorMsg = "Database configuration (db_config.php) is missing on your Hostinger server. Please create it using db_config.example.php.";
                    } else {
                        errorMsg = errorData.error || errorData.details || errorMsg;
                    }
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
                // Small delay to ensure cookies are saved on mobile
                setTimeout(() => {
                    window.location.replace('index.html');
                }, 500);
            } else {
                showStatus(loginStatus, result.error, 'error');
                if (loginBtn) loginBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            showStatus(loginStatus, 'Error: ' + error.message, 'error');
            if (loginBtn) loginBtn.disabled = false;
        }
    });

    // Handle Forgot Password - Step 1: Send Code
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
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
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async () => {
            const forgotEmail = document.getElementById('forgotEmail');
            const forgotCode = document.getElementById('forgotCode');
            if (!forgotEmail || !forgotCode) return;
            
            const email = forgotEmail.value;
            const code = forgotCode.value;

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
    if (resetPassBtn) {
        resetPassBtn.addEventListener('click', async () => {
            const forgotEmail = document.getElementById('forgotEmail');
            const forgotCode = document.getElementById('forgotCode');
            const forgotNewPass = document.getElementById('forgotNewPass');
            if (!forgotEmail || !forgotCode || !forgotNewPass) return;

            const email = forgotEmail.value;
            const code = forgotCode.value;
            const newPassword = forgotNewPass.value;

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
