/**
 * ==============================================================================
 * THEME ENGINE & GLOBAL MASTER CONTROLLER | National Student Portal
 * ==============================================================================
 * A robust, enterprise-grade state manager for handling visual preferences and system security.
 * * Features:
 * 1. Quad-State Logic: System, Light, Dark, Custom.
 * 2. Real-Time OS Synchronization (Dynamic System switching).
 * 3. Cross-Tab Event Listening (Syncs across multiple open windows).
 * 4. CSS Variable Injection for Custom Theming.
 * 5. [NEW] Dynamic Mobile Meta-Tag Color Synchronization.
 * 6. [NEW] Global App Preloader Engine.
 * 7. [NEW] Real-Time Network Connection Monitoring.
 * 8. [NEW] 15-Minute Security Idle Timeout Protocol.
 * * @author Lead Engineer
 * @version 3.0 (Enterprise Gold Edition)
 * ==============================================================================
 */

(function() {
    // --- CONSTANTS & CONFIG ---
    const STORAGE_KEY_THEME = "portal-theme";
    const STORAGE_KEY_COLOR = "portal-custom-color";
    const DEFAULT_COLOR = "#2563eb"; // Standard Portal Blue
    const DARK_CLASS = "dark-mode";
    const CUSTOM_CLASS = "custom-mode";
    const IDLE_LIMIT = 20 * 60; // 20 minutes in seconds

    let idleTime = 0; // State tracker for security timeout

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

        // 3. UI & Browser Synchronization
        syncUI(theme, color);
        syncMobileBrowserColor(theme, color);
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

    /**
     * PREMIUM ADDITIVE: Synchronizes the mobile browser's top status bar with the app theme.
     */
    function syncMobileBrowserColor(theme, color) {
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = "theme-color";
            document.head.appendChild(metaTheme);
        }

        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            metaTheme.content = "#0f172a"; // Deep Slate for Dark Mode
        } else if (theme === 'custom') {
            metaTheme.content = color; // Exact Custom Hex
        } else {
            metaTheme.content = "#ffffff"; // Pure White for Light Mode
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

    // --- 3. ENTERPRISE GLOBAL INFRASTRUCTURE ---

    /**
     * Injects the Preloader and Network Toast dynamically into the DOM
     */
    function injectEnterpriseUI() {
        // 1. Global Preloader Injection
        if (!document.querySelector('.global-preloader')) {
            const preloader = document.createElement('div');
            preloader.className = 'global-preloader';
            preloader.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text">NTS Secure Portal</div>
            `;
            document.body.prepend(preloader);
        }

        // 2. Network Toast Injection
        if (!document.getElementById('networkToast')) {
            const toast = document.createElement('div');
            toast.className = 'network-toast';
            toast.id = 'networkToast';
            toast.innerHTML = `<i class="fas fa-wifi"></i> <span>Connection Restored</span>`;
            document.body.appendChild(toast);
        }
    }

    /**
     * Safely fades out and removes the preloader once assets are ready
     */
    function removePreloader() {
        const preloader = document.querySelector('.global-preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.classList.add('fade-out');
                setTimeout(() => preloader.remove(), 500); // Remove from DOM after fade
            }, 400); // Tiny delay ensures smooth UI rendering
        }
    }

    /**
     * Handles dynamic WiFi status updates
     */
    function updateNetworkStatus() {
        const toast = document.getElementById('networkToast');
        if (!toast) return;

        if (navigator.onLine) {
            toast.innerHTML = `<i class="fas fa-wifi"></i> <span>Secure Connection Restored</span>`;
            toast.classList.add('online');
            toast.classList.add('show');
            
            // Auto-hide after 4 seconds
            setTimeout(() => { toast.classList.remove('show'); }, 4000);
        } else {
            toast.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>Offline: Check your internet connection</span>`;
            toast.classList.remove('online');
            toast.classList.add('show');
        }
    }

    /**
     * Initiates the 15-Minute Security Idle Timeout
     */
    function initSecurityTimeout() {
        const path = window.location.pathname;
        
        // Only run security timeout on authenticated pages
        if (!path.includes('index.html') && !path.includes('login.html') && !path.includes('signup.html') && !path.includes('404.html') && path !== '/') {
            
            const resetIdleTimer = () => { idleTime = 0; };
            
            // Listen for any user activity
            window.addEventListener('mousemove', resetIdleTimer);
            window.addEventListener('keypress', resetIdleTimer);
            window.addEventListener('click', resetIdleTimer);
            window.addEventListener('scroll', resetIdleTimer);
            window.addEventListener('touchstart', resetIdleTimer);

            // Execute check every second
            setInterval(() => {
                idleTime++;
                if (idleTime >= IDLE_LIMIT) {
                    // Trigger absolute backend logout
                    fetch('/api/auth/logout', { method: 'POST' })
                        .then(() => {
                            localStorage.removeItem('portal-user-role');
                            window.location.href = 'index.html';
                        })
                        .catch(() => {
                            window.location.href = 'index.html'; // Fallback
                        });
                }
            }, 1000);
        }
    }

    /**
     * Prints a professional branded message in the Developer Console
     */
    function printConsoleBrand() {
        const style1 = "color: #2563eb; font-size: 24px; font-weight: 800; font-family: sans-serif;";
        const style2 = "color: #10b981; font-size: 12px; font-family: monospace; padding-top: 5px;";
        console.log("%c🎓 National Tertiary Student Portal", style1);
        console.log("%cSystem Core Initialized. Encrypted Protocols Active. Version 3.0", style2);
    }


    // --- 4. EVENT LISTENERS & INITIALIZATION ---

    /**
     * Core Initialization Routine
     * Runs immediately to prevent FOUC (Flash of Unstyled Content)
     */
    function init() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "system";
        const savedColor = localStorage.getItem(STORAGE_KEY_COLOR) || DEFAULT_COLOR;
        applyTheme(savedTheme, savedColor);
    }

    // Run on script load
    init();

    // Secondary load protocols
    document.addEventListener("DOMContentLoaded", () => {
        init(); // Failsafe initialization
        injectEnterpriseUI();
        initSecurityTimeout();
        printConsoleBrand();
    });

    // Window Listeners
    window.addEventListener('load', removePreloader);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Watch for System Theme Changes (Real-time OS switching)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem(STORAGE_KEY_THEME) === 'system') {
            applySystemPreference();
            syncMobileBrowserColor('system', null);
        }
    });

    // Watch for Cross-Tab Changes (Sync across open windows)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_THEME || e.key === STORAGE_KEY_COLOR) {
            init(); // Re-initialize if data changes in another tab
        }
    });

})();