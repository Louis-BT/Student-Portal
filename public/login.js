/**
 * National Student Portal - Authentication Logic
 * Professional Grade Script for Handling Login & Session Management
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM ELEMENTS ---
    // Instead of looking for an inline onsubmit, we grab the form itself
    const loginForm = document.querySelector('form'); 
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    const submitBtn = document.querySelector('.btn-auth');
    const rememberMeCheckbox = document.querySelector('input[type="checkbox"]');

    // --- 2. INITIALIZATION ---
    const savedEmail = localStorage.getItem('portal-remember-email');
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if(rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    // --- 3. PASSWORD VISIBILITY TOGGLE ---
    if (toggleIcon && passwordInput) {
        toggleIcon.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            toggleIcon.classList.toggle('fa-eye');
            toggleIcon.classList.toggle('fa-eye-slash');
        });
    }

    // --- 4. PERFECTED LOGIN HANDLER ---
    // Note: Removed 'window.handleLogin' because we are attaching it directly to the form below
    async function executeLogin(event) {
        // CRITICAL: Stop the page from reloading when the button is clicked!
        if (event) {
            event.preventDefault(); 
        }

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        // A. VALIDATION
        if (!validateEmail(email)) {
            showError(emailInput, "Please enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            showError(passwordInput, "Password must be at least 6 characters.");
            return;
        }

        // B. LOADING STATE
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
        submitBtn.style.opacity = '0.7';

        // C. AUTHENTICATION LOGIC
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // Catch 404s or 502s before JSON parsing crashes
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server Misconfiguration: Backend route '/api/auth/login' not found.");
            }

            const data = await response.json();

            // Handle invalid credentials
            if (!response.ok || data.error) {
                throw new Error(data.error || "Invalid Email or Password");
            }

            // SUCCESS FLOW
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('portal-remember-email', email);
            } else {
                localStorage.removeItem('portal-remember-email');
            }

            createSession(data.user);

            submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
            submitBtn.style.background = '#10b981'; // Green
            submitBtn.style.color = 'white';
            
            setTimeout(() => {
                if (data.user.role === 'ADMIN') {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 500);

        } catch (err) {
            console.error("Login Error:", err);
            
            // Reset UI
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            
            // Give the user a specific error message, not a generic one
            if (err.message === "Failed to fetch" || err.message.includes("NetworkError")) {
                alert("Server Connection Failed. If the app just woke up on Render, please wait 15 seconds and click login again.");
            } else {
                alert(err.message);
            }
        }
    }

    // Attach the new executeLogin function securely to the form submission
    if (loginForm) {
        // This handles both clicking the button and hitting 'Enter' on the keyboard
        loginForm.addEventListener('submit', executeLogin);
    }
    
    // Fallback: If your button doesn't trigger the form submit, attach it here too
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            // Only trigger if it's inside a form to let the form handler do the work
            if(!submitBtn.closest('form')) {
                executeLogin(e);
            }
        });
    }

    // Keep this for your HTML button's inline onclick if you have one
    window.handleLogin = executeLogin;

    // --- HELPER FUNCTIONS ---
    function createSession(user) {
        localStorage.setItem('portal-user-role', user.role);
        localStorage.setItem('portal-user-name', user.name);
        localStorage.setItem('portal-user-email', user.email);
        localStorage.setItem('portal-user-id', user.id);
        
        if (user.avatar) {
            localStorage.setItem('portal-avatar', user.avatar);
        } else {
            localStorage.removeItem('portal-avatar');
        }
    }

    function showError(inputElement, message) {
        inputElement.style.borderColor = '#ef4444';
        inputElement.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
        
        inputElement.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300, iterations: 1 });

        inputElement.focus();

        inputElement.addEventListener('input', () => {
            inputElement.style.borderColor = '';
            inputElement.style.boxShadow = '';
        }, { once: true });
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // --- 5. FORGOT PASSWORD LOGIC ---
    window.toggleForgotModal = function(show) {
        const modal = document.getElementById('forgot-modal');
        const resetEmailInput = document.getElementById('reset-email');
        
        if (show) {
            modal.classList.add('active');
            if(resetEmailInput) resetEmailInput.focus();
        } else {
            modal.classList.remove('active');
            document.getElementById('reset-feedback').style.display = 'none';
            if(resetEmailInput) resetEmailInput.value = ''; 
        }
    };

    window.onclick = function(event) {
        const modal = document.getElementById('forgot-modal');
        if (event.target === modal) {
            toggleForgotModal(false);
        }
    };

    window.handleForgotSubmit = function() {
        const email = document.getElementById('reset-email').value;
        const feedback = document.getElementById('reset-feedback');
        const btn = document.getElementById('reset-btn');

        if (!validateEmail(email)) {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color: #ef4444;">Please enter a valid email.</span>`;
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> ${data.message}</span>`;
            setTimeout(() => toggleForgotModal(false), 3000);
        })
        .catch(err => {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color: #ef4444;">Server Error. Try again later.</span>`;
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    };

});