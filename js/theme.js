/*
 * Jerco Digital Solusi - Theme Handler
 * File: js/theme.js
 * Purpose: Dark/light mode switcher with localStorage persistence.
 */

(function () {
    'use strict';

    const CONFIG = window.SITE_CONFIG || {};
    const THEME_CONFIG = CONFIG.theme || {};
    const STORAGE_KEY = THEME_CONFIG.storageKey || 'color-theme';
    const DEFAULT_THEME = THEME_CONFIG.default || 'system';

    const SELECTORS = {
        toggle: [
            '#theme-toggle',
            '#theme-toggle-mobile',
            '[data-theme-toggle]'
        ].join(','),
        icon: '[data-theme-icon]',
        label: '[data-theme-label]'
    };

    let initialized = false;

    function systemPrefersDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function getStoredTheme() {
        return localStorage.getItem(STORAGE_KEY);
    }

    function getCurrentTheme() {
        const storedTheme = getStoredTheme();

        if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
        }

        if (DEFAULT_THEME === 'dark' || DEFAULT_THEME === 'light') {
            return DEFAULT_THEME;
        }

        return systemPrefersDark() ? 'dark' : 'light';
    }

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) return;

        const colors = {
            light: '#0F3C5C',
            dark: '#082032'
        };

        metaThemeColor.setAttribute('content', colors[theme] || colors.light);
    }

    function updateToggleState(theme) {
        const buttons = document.querySelectorAll(SELECTORS.toggle);
        const isDark = theme === 'dark';

        buttons.forEach((button) => {
            button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            button.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            button.setAttribute('data-theme-current', theme);

            const icon = button.querySelector(SELECTORS.icon);
            if (icon) {
                icon.className = isDark ? 'ph ph-sun text-lg' : 'ph ph-moon text-lg';
            }

            const label = button.querySelector(SELECTORS.label);
            if (label) {
                label.textContent = isDark ? 'Light' : 'Dark';
            }
        });
    }

    function dispatchThemeChange(theme) {
        window.dispatchEvent(new CustomEvent('jerco:theme-change', {
            detail: { theme, isDark: theme === 'dark' }
        }));
    }

    function applyTheme(theme, options = {}) {
        const nextTheme = theme === 'dark' ? 'dark' : 'light';

        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        document.documentElement.setAttribute('data-theme', nextTheme);

        if (options.persist !== false) {
            localStorage.setItem(STORAGE_KEY, nextTheme);
        }

        updateMetaThemeColor(nextTheme);
        updateToggleState(nextTheme);
        dispatchThemeChange(nextTheme);

        return nextTheme;
    }

    function toggleTheme() {
        const nextTheme = isDarkMode() ? 'light' : 'dark';
        return applyTheme(nextTheme);
    }

    function bindThemeToggle() {
        const buttons = document.querySelectorAll(SELECTORS.toggle);

        buttons.forEach((button) => {
            if (button.dataset.themeBound === 'true') return;

            button.dataset.themeBound = 'true';
            button.addEventListener('click', () => {
                toggleTheme();
            });
        });
    }

    function watchSystemTheme() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (event) => {
            const storedTheme = getStoredTheme();

            // Only follow system theme when user has not manually selected light/dark.
            if (storedTheme === 'dark' || storedTheme === 'light') return;

            applyTheme(event.matches ? 'dark' : 'light', { persist: false });
        });
    }

    function observeDynamicNavigation() {
        const header = document.getElementById('site-header');
        const footer = document.getElementById('site-footer');
        const targets = [header, footer, document.body].filter(Boolean);

        const observer = new MutationObserver(() => {
            bindThemeToggle();
            updateToggleState(getCurrentTheme());
        });

        targets.forEach((target) => {
            observer.observe(target, {
                childList: true,
                subtree: true
            });
        });
    }

    function initTheme() {
        if (initialized) return;
        initialized = true;

        applyTheme(getCurrentTheme(), { persist: Boolean(getStoredTheme()) });
        bindThemeToggle();
        watchSystemTheme();
        observeDynamicNavigation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    window.JercoTheme = {
        init: initTheme,
        set: applyTheme,
        toggle: toggleTheme,
        get: getCurrentTheme,
        isDark: isDarkMode
    };
})();
