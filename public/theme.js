/**
 * theme.js - The "Brain" of the Portal's Appearance
 * Handles System, Light, Dark, and Custom themes.
 */

// 1. Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    
    // Apply immediately
    setTheme(savedTheme);

    // Sync Dropdowns (if they exist on the page)
    const selectors = document.querySelectorAll('select[onchange="setTheme(this.value)"]');
    selectors.forEach(sel => sel.value = savedTheme);

    // Sync Color Picker (if it exists)
    const colorPicker = document.getElementById('custom-color');
    if (colorPicker) {
        colorPicker.value = localStorage.getItem('customColor') || '#2563eb';
        colorPicker.addEventListener('input', (e) => {
            handleCustomColorChange(e.target.value);
        });
    }
});

// 2. Main Theme Switcher Function (Global)
window.setTheme = function(theme) {
    // Save Preference
    localStorage.setItem('theme', theme);
    
    const root = document.documentElement;
    const colorPicker = document.getElementById('custom-color');

    // Show/Hide Color Picker based on mode
    if (colorPicker) {
        colorPicker.style.display = (theme === 'custom') ? 'inline-block' : 'none';
    }

    // --- LOGIC ---
    if (theme === 'system') {
        resetCustomStyles();
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } 
    else if (theme === 'light') {
        resetCustomStyles();
        root.setAttribute('data-theme', 'light');
    } 
    else if (theme === 'dark') {
        resetCustomStyles();
        root.setAttribute('data-theme', 'dark');
    } 
    else if (theme === 'custom') {
        root.setAttribute('data-theme', 'custom');
        
        // Retrieve saved color or ask user
        let color = localStorage.getItem('customColor');
        
        if (!color) {
            // If no color picker input exists, prompt the user
            if (!document.getElementById('custom-color')) {
                color = prompt("Enter a Hex Color for your theme (e.g. #ff5733):", "#2563eb");
            }
            // Default if cancelled
            if (!color) color = "#2563eb"; 
            
            localStorage.setItem('customColor', color);
        }
        
        applyCustomColor(color);
    }
}

// 3. Apply Custom Logic
function applyCustomColor(color) {
    const root = document.documentElement;
    
    // Save it
    localStorage.setItem('customColor', color);

    // Apply Brand Color
    root.style.setProperty('--primary-color', color);
    
    // Calculate a matching secondary color (slightly darker)
    // You can also change the background here if you wish, 
    // but usually, it's safer to keep the background neutral (dark/light) 
    // and only pop the primary elements.
    root.style.setProperty('--secondary-color', color);
}

function handleCustomColorChange(color) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'custom') {
        applyCustomColor(color);
    }
}

// 4. Helper: Reset to default CSS variables
function resetCustomStyles() {
    const root = document.documentElement;
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--bg-color');
}

// 5. Listener for System Changes (if user is in 'System' mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('theme') === 'system') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});