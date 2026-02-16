// ============================================
// SIGNUP PAGE LOGIC (signup.js)
// ============================================

// 1. Get Elements
const form = document.getElementById('signupForm');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirm_password');
const errorMessage = document.getElementById('error-message');

const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

const reqLength = document.getElementById('req-length');
const reqUppercase = document.getElementById('req-uppercase');
const reqLowercase = document.getElementById('req-lowercase');
const reqNumber = document.getElementById('req-number');
const reqSpecial = document.getElementById('req-special');

// 2. Toggle Password Visibility (Show/Hide)
function togglePassword(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if(field.type === 'password') {
        field.type = 'text';
        btn.textContent = 'Hide';
    } else {
        field.type = 'password';
        btn.textContent = 'Show';
    }
}

// 3. Password Strength & Requirements
if (password) {
    password.addEventListener('input', function() {
        const val = password.value;
        let strength = 0;

        // Check Requirements
        if(val.length >= 6) { reqLength.classList.replace('invalid','valid'); strength++; } 
        else { reqLength.classList.replace('valid','invalid'); }

        if(/[A-Z]/.test(val)) { reqUppercase.classList.replace('invalid','valid'); strength++; } 
        else { reqUppercase.classList.replace('valid','invalid'); }

        if(/[a-z]/.test(val)) { reqLowercase.classList.replace('invalid','valid'); strength++; } 
        else { reqLowercase.classList.replace('valid','invalid'); }

        if(/[0-9]/.test(val)) { reqNumber.classList.replace('invalid','valid'); strength++; } 
        else { reqNumber.classList.replace('valid','invalid'); }

        if(/[\W]/.test(val)) { reqSpecial.classList.replace('invalid','valid'); strength++; } 
        else { reqSpecial.classList.replace('valid','invalid'); }

        // Update Strength Bar Color
        if (strengthBar && strengthText) {
            switch(strength) {
                case 0: case 1:
                    strengthBar.style.width = '20%'; strengthBar.style.backgroundColor = 'red'; strengthText.textContent = 'Very Weak'; break;
                case 2:
                    strengthBar.style.width = '40%'; strengthBar.style.backgroundColor = 'orange'; strengthText.textContent = 'Weak'; break;
                case 3:
                    strengthBar.style.width = '60%'; strengthBar.style.backgroundColor = 'yellow'; strengthText.textContent = 'Moderate'; break;
                case 4:
                    strengthBar.style.width = '80%'; strengthBar.style.backgroundColor = '#3BB143'; strengthText.textContent = 'Strong'; break;
                case 5:
                    strengthBar.style.width = '100%'; strengthBar.style.backgroundColor = 'green'; strengthText.textContent = 'Very Strong'; break;
            }
        }
    });
}

// 4. Confirm Password Check on Submit
if (form) {
    form.addEventListener('submit', function(event) {
        if(password.value !== confirmPassword.value) {
            event.preventDefault(); // Stop submission
            errorMessage.style.display = 'block';
            confirmPassword.focus();
        } else {
            errorMessage.style.display = 'none';
        }
    });
}