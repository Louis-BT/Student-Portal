const themeSelect = document.getElementById('theme-select');
const colorPicker = document.getElementById('custom-color');
const root = document.documentElement;

// 1. Load saved settings
const savedTheme = localStorage.getItem('theme') || 'system';
const savedColor = localStorage.getItem('customColor') || '#1e3a8a';

// 2. Initialize
applyTheme(savedTheme);
if (themeSelect) themeSelect.value = savedTheme;
if (colorPicker) colorPicker.value = savedColor;

// 3. Listen for changes
if (themeSelect) {
    themeSelect.addEventListener('change', () => {
        const selected = themeSelect.value;
        localStorage.setItem('theme', selected);
        applyTheme(selected);
    });
}

if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        localStorage.setItem('customColor', color);
        if (themeSelect.value === 'custom') {
            applyCustomColor(color);
        }
    });
}

function applyTheme(theme) {
    // Show/Hide Color Picker
    if (colorPicker) {
        colorPicker.style.display = (theme === 'custom') ? 'inline-block' : 'none';
    }

    if (theme === 'custom') {
        const color = localStorage.getItem('customColor') || '#1e3a8a';
        applyCustomColor(color);
        root.setAttribute('data-theme', 'custom');
    } 
    else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        resetBackground();
    } 
    else {
        root.setAttribute('data-theme', theme);
        resetBackground();
    }
}

function applyCustomColor(color) {
    // Set Main Primary Color
    root.style.setProperty('--primary-color', color);
    
    // Set Background to a very light version of the chosen color
    // We use a simple trick: mixing the color with white (using opacity visually)
    // or simply setting a tinted background if possible. 
    // Here we will use a light mix for --bg-color
    const lightBg = lightenColor(color, 95); // 95% lighter
    root.style.setProperty('--bg-color', lightBg);
    root.style.setProperty('--secondary-color', color); 
}

function resetBackground() {
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--bg-color');
    root.style.removeProperty('--secondary-color');
}

// Helper to lighten a hex color
function lightenColor(color, percent) {
    var num = parseInt(color.replace("#",""),16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = (num >> 8 & 0x00FF) + amt,
    G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}