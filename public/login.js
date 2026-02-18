/**
 * National Student Portal - Authentication Logic
 * Professional Grade Script for Handling Login & Session Management
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM ELEMENTS ---
    const loginForm = document.querySelector('form');
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

    // --- 4. LOGIN HANDLER ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Stop default HTML submission
            handleAuthentication();
        });
    }

    /**
     * Core Authentication Function
     * Validates input, simulates server request, and sets session data.
     */
    function handleAuthentication() {
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

        // C. AUTHENTICATION LOGIC (Simulated Server Delay)
        setTimeout(() => {
            
            // 1. Handle "Remember Me"
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('portal-remember-email', email);
            } else {
                localStorage.removeItem('portal-remember-email');
            }

            // 2. Role Detection & Session Setup
            if (email === 'admin@portal.edu.gh') {
                // --- ADMIN SESSION ---
                createSession({
                    role: 'ADMIN',
                    name: 'System Administrator',
                    id: 'ADM-001',
                    avatar: 'https://via.placeholder.com/70/ef4444/ffffff?text=AD',
                    institution: 'National Directorate'
                });
            } else {
                // --- STUDENT SESSION ---
                // If user signed up previously, use that name. Otherwise default.
                const storedName = localStorage.getItem('portal-user-name') || 'Student User';
                
                createSession({
                    role: 'STUDENT',
                    name: storedName,
                    id: '10293844',
                    avatar: null, // Will use default placeholder
                    institution: 'University of Ghana' // Default for demo
                });
            }

            // 3. Success & Redirect
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
            submitBtn.style.background = '#10b981'; // Green
            
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);

        }, 1500); // 1.5s simulated delay
    }

    /**
     * Helper: Create Session in LocalStorage
     * Acts as the "cookie" for the application.
     */
    function createSession(user) {
        localStorage.setItem('portal-user-role', user.role);
        localStorage.setItem('portal-user-name', user.name);
        localStorage.setItem('portal-user-id', user.id);
        
        // Only set avatar if one is provided (Admin), otherwise let dashboard use default
        if (user.avatar) {
            localStorage.setItem('portal-avatar', user.avatar);
        } else {
            localStorage.removeItem('portal-avatar');
        }

        // Initialize empty data if new user
        if (!localStorage.getItem('portal-gpa')) {
            localStorage.setItem('portal-gpa', '0.00');
        }
    }

    /**
     * Helper: Visual Error Feedback
     * Shakes the input field and highlights it red.
     */
    function showError(inputElement, message) {
        // Reset styles first
        inputElement.style.borderColor = '#ef4444';
        inputElement.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
        
        // Shake Animation
        inputElement.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 300,
            iterations: 1
        });

        // Focus back
        inputElement.focus();

        // Reset after interaction
        inputElement.addEventListener('input', () => {
            inputElement.style.borderColor = '';
            inputElement.style.boxShadow = '';
        }, { once: true });
    }

    /**
     * Helper: Email Validator
     * Basic Regex to ensure proper email format
     */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

});