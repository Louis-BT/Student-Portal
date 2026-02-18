/**
 * theme.js - Enterprise Grade Theme Manager
 * Capabilities: System Sync, Light/Dark Toggle, Custom Color Injection, State Persistence
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize State
    const savedTheme = localStorage.getItem("portal-theme") || "system";
    const savedColor = localStorage.getItem("portal-custom-color") || "#2563eb";

    // 2. Sync UI Elements (Dropdown & Picker)
    const selector = document.getElementById("theme-selector");
    const picker = document.getElementById("custom-theme-picker");

    if (selector) selector.value = savedTheme;
    if (picker) picker.value = savedColor;

    // 3. Apply Logic (Visuals only, no interaction triggers)
    applyTheme(savedTheme, savedColor);
});

/**
 * LISTENER: Watch for System (OS) Theme Changes
 * Updates real-time if the user is in "System" mode.
 */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem("portal-theme") === 'system') {
        applySystemTheme();
    }
});

/**
 * ACTION: User selects a theme from the dropdown
 */
function setTheme(theme) {
    const savedColor = localStorage.getItem("portal-custom-color") || "#2563eb";
    const picker = document.getElementById("custom-theme-picker");

    // 1. Save Preference
    localStorage.setItem("portal-theme", theme);

    // 2. Apply Visuals
    applyTheme(theme, savedColor);

    // 3. Interaction: Auto-open picker ONLY when manually switching to Custom
    if (theme === 'custom' && picker) {
        setTimeout(() => picker.click(), 50); 
    }
}

/**
 * ACTION: User drags the Color Picker
 */
function updateCustomColor(color) {
    // 1. Save Data
    localStorage.setItem("portal-custom-color", color);
    localStorage.setItem("portal-theme", "custom"); // Force theme to custom

    // 2. Sync Dropdown (Visual Feedback)
    const selector = document.getElementById("theme-selector");
    if (selector) selector.value = "custom";

    // 3. Apply Changes
    applyTheme("custom", color);
}

/**
 * CORE LOGIC: Applies CSS Classes, Variables & Visibility
 * This is the Single Source of Truth for UI State.
 */
function applyTheme(theme, color) {
    const body = document.body;
    const root = document.documentElement;
    const picker = document.getElementById("custom-theme-picker");

    // 1. Reset everything to baseline
    body.classList.remove("dark-mode", "custom-mode");
    root.style.removeProperty('--primary-color');

    // 2. Handle Picker Visibility (Default to hidden)
    if (picker) picker.style.display = 'none';

    // 3. Switch Logic
    switch (theme) {
        case 'system':
            applySystemTheme();
            break;

        case 'dark':
            body.classList.add("dark-mode");
            break;

        case 'custom':
            body.classList.add("custom-mode");
            root.style.setProperty('--primary-color', color);
            // Only show picker in Custom mode
            if (picker) picker.style.display = 'inline-block';
            break;

        case 'light':
        default:
            // Default behavior (Light mode)
            break;
    }
}

/**
 * HELPER: Determines if System is Dark or Light
 */
function applySystemTheme() {
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemIsDark) {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}