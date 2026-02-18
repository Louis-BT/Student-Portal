/**
 * ==============================================================================
 * THEME ENGINE | National Student Portal
 * ==============================================================================
 * A robust, enterprise-grade state manager for handling visual preferences.
 * * Features:
 * 1. Quad-State Logic: System, Light, Dark, Custom.
 * 2. Real-Time OS Synchronization (Dynamic System switching).
 * 3. Cross-Tab Event Listening (Syncs across multiple open windows).
 * 4. CSS Variable Injection for Custom Theming.
 * * @author Lead Engineer
 * ==============================================================================
 */

(function() {
    // --- CONSTANTS & CONFIG ---
    const STORAGE_KEY_THEME = "portal-theme";
    const STORAGE_KEY_COLOR = "portal-custom-color";
    const DEFAULT_COLOR = "#2563eb"; // Standard Portal Blue
    const DARK_CLASS = "dark-mode";
    const CUSTOM_CLASS = "custom-mode";

    // --- 1. CORE APPLICATION LOGIC ---
    
    /**
     * The Brain: Decides what classes/styles to apply based on inputs.
     * @param {string} theme - 'system', 'light', 'dark', 'custom'
     * @param {string} color - Hex color code
     */
    function applyTheme(theme, color) {
        const body = document.body;
        const root = document.documentElement;
        
        // 1. Clean Slate (Remove specific mode classes)
        body.classList.remove(DARK_CLASS, CUSTOM_CLASS);
        root.style.removeProperty('--primary-color');

        // 2. Logic Switch
        switch (theme) {
            case 'system':
                applySystemPreference();
                break;
            
            case 'dark':
                body.classList.add(DARK_CLASS);
                break;
            
            case 'custom':
                body.classList.add(CUSTOM_CLASS);
                root.style.setProperty('--primary-color', color);
                break;
            
            case 'light':
            default:
                // Default is light (no specific class needed due to CSS structure)
                break;
        }

        // 3. UI Synchronization (Update Dropdowns/Pickers if they exist)
        syncUI(theme, color);
    }

    /**
     * Helper: Detects OS preference and applies it.
     */
    function applySystemPreference() {
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemIsDark) {
            document.body.classList.add(DARK_CLASS);
        } else {
            document.body.classList.remove(DARK_CLASS);
        }
    }

    /**
     * Helper: Updates buttons, selects, and inputs to match internal state.
     */
    function syncUI(theme, color) {
        const selector = document.getElementById("theme-selector");
        const picker = document.getElementById("custom-theme-picker");

        if (selector) selector.value = theme;
        
        if (picker) {
            picker.value = color;
            // Only show the color picker if we are in 'Custom' mode
            picker.style.display = (theme === 'custom') ? 'inline-block' : 'none';
        }
    }

    // --- 2. PUBLIC API (Global Functions) ---

    /**
     * Triggered by <select onchange="...">
     */
    window.setTheme = function(theme) {
        const currentColor = localStorage.getItem(STORAGE_KEY_COLOR) || DEFAULT_COLOR;
        
        // Save State
        localStorage.setItem(STORAGE_KEY_THEME, theme);
        
        // Apply
        applyTheme(theme, currentColor);

        // UX: If selecting custom, auto-open the picker
        if (theme === 'custom') {
            const picker = document.getElementById("custom-theme-picker");
            if (picker) {
                // Small delay to ensure display:block is rendered before click
                setTimeout(() => picker.click(), 50); 
            }
        }
    };

    /**
     * Triggered by <input type="color" oninput="...">
     */
    window.updateCustomColor = function(color) {
        // Save State
        localStorage.setItem(STORAGE_KEY_COLOR, color);
        localStorage.setItem(STORAGE_KEY_THEME, 'custom'); // Changing color forces Custom mode

        // Apply
        applyTheme('custom', color);
    };

    // --- 3. EVENT LISTENERS & INITIALIZATION ---

    /**
     * Initialization Routine
     * Runs immediately to prevent FOUC (Flash of Unstyled Content)
     */
    function init() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "system";
        const savedColor = localStorage.getItem(STORAGE_KEY_COLOR) || DEFAULT_COLOR;
        applyTheme(savedTheme, savedColor);
    }

    // Run on script load (Block render slightly to ensure correct theme)
    init();

    // Re-run on DOMContentLoaded to catch elements that weren't ready
    document.addEventListener("DOMContentLoaded", init);

    // Watch for System Theme Changes (Real-time OS switching)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem(STORAGE_KEY_THEME) === 'system') {
            applySystemPreference();
        }
    });

    // Watch for Cross-Tab Changes (Sync across open windows)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_THEME || e.key === STORAGE_KEY_COLOR) {
            init(); // Re-initialize if data changes in another tab
        }
    });

})();