/**
 * auth.js - Frontend Logic for Authentication
 * Completely rewritten for robustness and debugging.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth script started.");

    // Helper to get element safely
    const getEl = (id) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Element not found: ${id}`);
        return el;
    };

    // Elements
    const loginSection = getEl('loginSection');
    const registerSection = getEl('registerSection');
    const forgotSection = getEl('forgotSection');
    
    const showRegister = getEl('showRegister');
    const showLogin = getEl('showLogin');
    const showForgot = getEl('showForgot');
    const backToLogin = getEl('backToLogin');
    
    const loginForm = getEl('loginForm');
    const registerForm = getEl('registerForm');
    const forgotForm = getEl('forgotForm');
    
    const loginStatus = getEl('loginStatus');
    const regStatus = getEl('regStatus');
    const forgotStatus = getEl('forgotStatus');
    
    const forgotEmailStep = getEl('forgotEmailStep');
    const forgotCodeStep = getEl('forgotCodeStep');
    const forgotPassStep = getEl('forgotPassStep');
    
    const verifyCodeBtn = getEl('verifyCodeBtn');
    const resetPassBtn = getEl('resetPassBtn');

    // Status Helper
    const showStatus = (el, message, type) => {
        if (!el) return;
        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';
        console.log(`Status [${type}]: ${message}`);
    };

    // Navigation Logic
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to Register");
            if (loginSection) loginSection.classList.add('hidden');
            if (registerSection) registerSection.classList.remove('hidden');
            if (forgotSection) forgotSection.classList.add('hidden');
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to Login");
            if (registerSection) registerSection.classList.add('hidden');
            if (forgotSection) forgotSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
        });
    }

    if (showForgot) {
        showForgot.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to Forgot Password");
            if (loginSection) loginSection.classList.add('hidden');
            if (forgotSection) forgotSection.classList.remove('hidden');
            if (forgotEmailStep) forgotEmailStep.classList.remove('hidden');
            if (forgotCodeStep) forgotCodeStep.classList.add('hidden');
            if (forgotPassStep) forgotPassStep.classList.add('hidden');
            if (forgotStatus) forgotStatus.style.display = 'none';
        });
    }

    if (backToLogin) {
        backToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Back to Login");
            if (forgotSection) forgotSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
        });
    }

    // API Helper
    const apiCall = async (action, data) => {
        try {
            const response = await fetch(`auth_api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include' // Important for sessions
            });

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Invalid JSON response:", text);
                throw new Error("Server returned invalid response.");
            }
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    };

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Login Submit");
            const user = getEl('loginUser').value;
            const pass = getEl('loginPass').value;
            const btn = loginForm.querySelector('button');

            if (btn) btn.disabled = true;
            showStatus(loginStatus, "Logging in...", "info");

            try {
                const result = await apiCall('login', { username: user, password: pass });
                if (result.success) {
                    showStatus(loginStatus, "Login successful! Redirecting...", "success");
                    setTimeout(() => window.location.replace('index.html'), 1000);
                } else {
                    showStatus(loginStatus, result.error || "Login failed", "error");
                    if (btn) btn.disabled = false;
                }
            } catch (error) {
                showStatus(loginStatus, error.message, "error");
                if (btn) btn.disabled = false;
            }
        });
    }

    // Register Handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Register Submit");
            const user = getEl('regUser').value;
            const email = getEl('regEmail').value;
            const pass = getEl('regPass').value;
            const btn = registerForm.querySelector('button');

            if (btn) btn.disabled = true;
            showStatus(regStatus, "Creating account...", "info");

            try {
                const result = await apiCall('register', { username: user, email: email, password: pass });
                if (result.success) {
                    showStatus(regStatus, "Account created! Redirecting to login...", "success");
                    setTimeout(() => {
                        if (showLogin) showLogin.click();
                    }, 2000);
                } else {
                    showStatus(regStatus, result.error || "Registration failed", "error");
                    if (btn) btn.disabled = false;
                }
            } catch (error) {
                showStatus(regStatus, error.message, "error");
                if (btn) btn.disabled = false;
            }
        });
    }

    // Forgot Password Handlers
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Only handles the first step (email)
            console.log("Forgot Password Submit (Email)");
            const email = getEl('forgotEmail').value;
            const btn = forgotForm.querySelector('button');

            if (btn) btn.disabled = true;
            showStatus(forgotStatus, "Sending code...", "info");

            try {
                const result = await apiCall('forgot-password', { email: email });
                if (result.success) {
                    showStatus(forgotStatus, result.message, "success");
                    if (forgotEmailStep) forgotEmailStep.classList.add('hidden');
                    if (forgotCodeStep) forgotCodeStep.classList.remove('hidden');
                } else {
                    showStatus(forgotStatus, result.error || "Failed to send code", "error");
                }
                if (btn) btn.disabled = false;
            } catch (error) {
                showStatus(forgotStatus, error.message, "error");
                if (btn) btn.disabled = false;
            }
        });
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Verify Code Click");
            const email = getEl('forgotEmail').value;
            const code = getEl('forgotCode').value;
            
            showStatus(forgotStatus, "Verifying code...", "info");

            try {
                const result = await apiCall('verify-code', { email: email, code: code });
                if (result.success) {
                    showStatus(forgotStatus, result.message, "success");
                    if (forgotCodeStep) forgotCodeStep.classList.add('hidden');
                    if (forgotPassStep) forgotPassStep.classList.remove('hidden');
                } else {
                    showStatus(forgotStatus, result.error || "Invalid code", "error");
                }
            } catch (error) {
                showStatus(forgotStatus, error.message, "error");
            }
        });
    }

    if (resetPassBtn) {
        resetPassBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Reset Password Click");
            const email = getEl('forgotEmail').value;
            const code = getEl('forgotCode').value;
            const newPass = getEl('forgotNewPass').value;

            showStatus(forgotStatus, "Resetting password...", "info");

            try {
                const result = await apiCall('reset-password', { email: email, code: code, newPassword: newPass });
                if (result.success) {
                    showStatus(forgotStatus, "Password reset! Redirecting...", "success");
                    setTimeout(() => {
                        if (backToLogin) backToLogin.click();
                    }, 2000);
                } else {
                    showStatus(forgotStatus, result.error || "Reset failed", "error");
                }
            } catch (error) {
                showStatus(forgotStatus, error.message, "error");
            }
        });
    }

    // Check Auth on Load
    const checkAuth = async () => {
        try {
            const response = await fetch('auth_api.php?action=check', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log("Already authenticated, redirecting.");
                    window.location.replace('index.html');
                }
            }
        } catch (e) {
            console.log("Auth check failed (not logged in).");
        }
    };
    checkAuth();
});
