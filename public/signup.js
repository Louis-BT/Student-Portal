/**
 * National Student Portal - Registration Logic
 * Premium script for handling user creation, validation, and session initialization.
 * * Architected for High Performance & UX Consistency.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INITIALIZATION & SETUP ---
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const phoneInput = document.getElementById('phone');
    
    // Sync Theme Selector on Load
    const savedTheme = localStorage.getItem("portal-theme") || "system";
    const themeSelector = document.querySelector('select[onchange="setTheme(this.value)"]');
    if(themeSelector) themeSelector.value = savedTheme;

    // --- 2. REAL-TIME FEEDBACK LISTENERS ---
    
    // A. Password Match Visualizer
    if (passwordInput && confirmInput) {
        [passwordInput, confirmInput].forEach(input => {
            input.addEventListener('input', () => {
                const p1 = passwordInput.value;
                const p2 = confirmInput.value;

                if (p2.length > 0) {
                    if (p1 === p2) {
                        confirmInput.style.borderColor = '#10b981'; // Green
                        confirmInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                    } else {
                        confirmInput.style.borderColor = '#ef4444'; // Red
                        confirmInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                    }
                } else {
                    confirmInput.style.borderColor = ''; // Reset
                    confirmInput.style.boxShadow = '';
                }
            });
        });
    }

    // B. Phone Number Formatter (Ghanaian Context)
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            // Remove non-numeric characters
            e.target.value = e.target.value.replace(/[^0-9+]/g, '');
        });
    }
});

/**
 * CORE REGISTRATION HANDLER
 * Triggered by the form onsubmit event.
 */
function handleSignup() {
    // 1. SELECT ELEMENTS
    const fname = document.getElementById('fname');
    const sname = document.getElementById('sname');
    const oname = document.getElementById('oname');
    const phone = document.getElementById('phone');
    const email = document.getElementById('email');
    const p1 = document.getElementById('password');
    const p2 = document.getElementById('confirm_password');
    const btn = document.querySelector('.btn-auth');

    // 2. EXTRACT & SANITIZE VALUES
    const firstName = capitalize(fname.value.trim());
    const surname = capitalize(sname.value.trim());
    const otherName = capitalize(oname.value.trim());
    const emailVal = email.value.trim().toLowerCase();
    const phoneVal = phone.value.trim();

    // 3. LOGIC: ADMIN BYPASS CHECK
    // If user enters 'Admin' as first name, they bypass the Surname requirement.
    const isAdmin = firstName.toLowerCase() === 'admin';

    // 4. VALIDATION ENGINE
    
    // Check Names
    if (!firstName) return showError(fname, "First Name is required.");
    if (!isAdmin && !surname) return showError(sname, "Surname is required.");

    // Check Phone (Basic Ghana Logic: 10 digits or starts with +233)
    if (phoneVal.length < 10) return showError(phone, "Please enter a valid phone number.");

    // Check Email
    if (!emailVal.includes('@') || !emailVal.includes('.')) return showError(email, "Invalid email format.");

    // Check Passwords
    if (p1.value.length < 6) return showError(p1, "Password must be at least 6 characters.");
    if (p1.value !== p2.value) return showError(p2, "Passwords do not match.");

    // 5. PROCESSING STATE
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creating Profile...';
    btn.style.opacity = '0.8';
    btn.disabled = true;

    // 6. DATA CONSTRUCTION
    // Concatenate names professionally
    let fullName = `${firstName} ${otherName} ${surname}`.replace(/\s+/g, ' ').trim();
    
    if (isAdmin && !surname) fullName = "System Administrator";

    // 7. SIMULATE DATABASE SAVE
    setTimeout(() => {
        // Save Session Data
        localStorage.setItem('portal-user-name', fullName);
        localStorage.setItem('portal-user-email', emailVal);
        localStorage.setItem('portal-user-phone', phoneVal);
        
        // Role Assignment
        if (isAdmin || emailVal === 'admin@portal.edu.gh') {
            localStorage.setItem('portal-user-role', 'ADMIN');
            localStorage.setItem('portal-avatar', 'https://via.placeholder.com/70/ef4444/ffffff?text=AD');
        } else {
            localStorage.setItem('portal-user-role', 'STUDENT');
            // Remove any old admin avatar
            localStorage.removeItem('portal-avatar');
        }

        // Initialize Empty Academic Data for New User
        if(!localStorage.getItem('portal-gpa')) localStorage.setItem('portal-gpa', '0.00');
        if(!localStorage.getItem('portal-courses')) localStorage.setItem('portal-courses', '[]');

        // Success Feedback
        btn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
        btn.style.background = '#10b981'; // Green

        setTimeout(() => {
            alert(`Welcome to the National Portal, ${firstName}! \nPlease login to continue.`);
            window.location.href = "login.html";
        }, 1000);

    }, 1500);
}

// --- HELPER FUNCTIONS ---

/**
 * Visual Error Feedback
 * Shakes the input and highlights it red.
 */
function showError(input, message) {
    // 1. Highlight
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
    input.focus();

    // 2. Shake Animation
    input.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], {
        duration: 300,
        iterations: 1
    });

    // 3. Optional: Toast Message (Using alert for simplicity in this version)
    // In a full React/Vue app, we would use a toast notification here.
    
    // 4. Reset on Input
    input.addEventListener('input', () => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }, { once: true });
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// --- CLOUD PROFILE CREATION ---
function createCloudProfile(user, fullName, studentEmail) {
    const userRef = db.ref('users/' + user.uid);
    
    return userRef.set({
        name: fullName,
        email: studentEmail,
        role: "STUDENT", // Default role for all new signups
        joinedDate: new Date().toISOString(),
        status: "ACTIVE"
    });
}