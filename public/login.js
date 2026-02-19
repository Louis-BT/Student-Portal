/**
 * National Student Portal - Authentication Logic
 * Professional Grade Script for Handling Login & Session Management
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM ELEMENTS ---
    const loginForm = document.querySelector('form[onsubmit*="handleLogin"]'); // Adjusted selector to avoid conflict if multiple forms exist
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    const submitBtn = document.querySelector('.btn-auth');
    const rememberMeCheckbox = document.querySelector('input[type="checkbox"]');

    // --- 2. INITIALIZATION ---
    
    // Check for "Remember Me" data
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
            
            // Toggle Icon Class
            toggleIcon.classList.toggle('fa-eye');
            toggleIcon.classList.toggle('fa-eye-slash');
        });
    }

    // --- 4. LOGIN HANDLER (EXPOSED TO GLOBAL SCOPE FOR HTML CALLS) ---
    window.handleLogin = function() {
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

        // C. AUTHENTICATION LOGIC (REAL SERVER CALL)
        // Replaced setTimeout with fetch to talk to server.js
        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Login Failed
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                alert(data.error);
            } else {
                // Login Success
                
                // 1. Handle "Remember Me"
                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    localStorage.setItem('portal-remember-email', email);
                } else {
                    localStorage.removeItem('portal-remember-email');
                }

                // 2. Set Session
                createSession(data.user);

                // 3. Success Visuals
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
                submitBtn.style.background = '#10b981'; // Green
                
                setTimeout(() => {
                    // Redirect based on Role
                    if (data.user.role === 'ADMIN') {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }, 500);
            }
        })
        .catch(err => {
            console.error("Login Error:", err);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            alert("Connection Error. Please try again.");
        });
    };

    /**
     * Helper: Create Session in LocalStorage
     */
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

    /**
     * Helper: Visual Error Feedback
     */
    function showError(inputElement, message) {
        inputElement.style.borderColor = '#ef4444';
        inputElement.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
        
        inputElement.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 300,
            iterations: 1
        });

        inputElement.focus();

        inputElement.addEventListener('input', () => {
            inputElement.style.borderColor = '';
            inputElement.style.boxShadow = '';
        }, { once: true });
    }

    /**
     * Helper: Email Validator
     */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }


    // --- 5. NEW: FORGOT PASSWORD LOGIC ---

    // Toggle Modal Visibility
    window.toggleForgotModal = function(show) {
        const modal = document.getElementById('forgot-modal');
        const resetEmailInput = document.getElementById('reset-email');
        
        if (show) {
            modal.classList.add('active');
            if(resetEmailInput) resetEmailInput.focus();
        } else {
            modal.classList.remove('active');
            // Reset modal state
            document.getElementById('reset-feedback').style.display = 'none';
            if(resetEmailInput) resetEmailInput.value = ''; 
        }
    };

    // Close modal if clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('forgot-modal');
        if (event.target === modal) {
            toggleForgotModal(false);
        }
    };

    // Handle Reset Submission
    window.handleForgotSubmit = function() {
        const email = document.getElementById('reset-email').value;
        const feedback = document.getElementById('reset-feedback');
        const btn = document.getElementById('reset-btn');

        if (!validateEmail(email)) {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color: #ef4444;">Please enter a valid email.</span>`;
            return;
        }

        // Loading State
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        // Call Server API
        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> ${data.message}</span>`;
            
            // Auto Close after 3 seconds
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