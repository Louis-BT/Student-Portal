// ============================================
// LOGIN PAGE LOGIC (login.js)
// ============================================

const loginForm = document.getElementById('loginForm');
const loginPassword = document.getElementById('password'); // Note: ID should match HTML
const loginError = document.getElementById('login-error'); // Ensure this ID exists in HTML

if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        if(loginPassword.value.trim() === '') {
            event.preventDefault();
            alert('Password cannot be empty'); // Simple alert fallback
            loginPassword.focus();
        }
    });
}