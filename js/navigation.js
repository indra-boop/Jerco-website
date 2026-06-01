/*
|--------------------------------------------------------------------------
| JERCO DIGITAL SOLUSI - NAVIGATION
|--------------------------------------------------------------------------
| File: js/navigation.js
| Purpose:
| - Render responsive header/navigation
| - Render footer
| - Handle mobile menu open/close
| - Provide active section highlight on scroll
|
| Dependency:
| - js/config.js must be loaded before this file
*/

(function () {
    'use strict';

    const CONFIG = window.SITE_CONFIG || {};
    const NAVIGATION = Array.isArray(CONFIG.navigation) ? CONFIG.navigation : [];
    const BRAND = CONFIG.brand || {};
    const CONTACT = CONFIG.contact || {};
    const UI = CONFIG.ui || {};

    const SELECTORS = {
        header: '#site-header',
        footer: '#site-footer',
        mobileMenuButton: '#mobile-menu-button',
        mobileMenu: '#mobile-menu',
        mobileMenuPanel: '#mobile-menu-panel',
        mobileMenuOverlay: '#mobile-menu-overlay',
        mobileMenuClose: '#mobile-menu-close',
        navLink: '[data-nav-link]',
        mobileNavLink: '[data-mobile-nav-link]'
    };

    const state = {
        currentLanguage: getStoredLanguage(),
        isMobileMenuOpen: false
    };

    function getStoredLanguage() {
        const languageConfig = CONFIG.language || {};
        const storageKey = languageConfig.storageKey || 'jerco-language';
        const fallback = languageConfig.defaultLanguage || 'id';

        try {
            return localStorage.getItem(storageKey) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function getNavigationLabel(item) {
        if (state.currentLanguage === 'en') {
            return item.labelEn || item.labelId || item.id;
        }

        return item.labelId || item.labelEn || item.id;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function buildDesktopNav() {
        return NAVIGATION.map(function (item) {
            return `
                <a
                    href="${escapeHtml(item.href)}"
                    class="nav-link"
                    data-nav-link
                    data-section="${escapeHtml(item.id)}"
                >
                    ${escapeHtml(getNavigationLabel(item))}
                </a>
            `;
        }).join('');
    }

    function buildMobileNav() {
        return NAVIGATION.map(function (item) {
            return `
                <a
                    href="${escapeHtml(item.href)}"
                    class="mobile-nav-link"
                    data-mobile-nav-link
                    data-section="${escapeHtml(item.id)}"
                >
                    <span>${escapeHtml(getNavigationLabel(item))}</span>
                    <i class="ph ph-arrow-right"></i>
                </a>
            `;
        }).join('');
    }

    function renderHeader() {
        const header = document.querySelector(SELECTORS.header);
        if (!header) return;

        const logo = BRAND.logo || 'assets/images/logo-jerco.png';
        const logoDark = BRAND.logoDark || 'assets/images/logo-jerco-dark-white-text-soft-shadow.svg';
        const brandName = BRAND.shortName || BRAND.legalName || 'Jerco Digital Solusi';

        header.className = 'site-header sticky top-0 z-50 bg-white/85 backdrop-blur-xl transition-all dark:bg-slate-950/85';

        header.innerHTML = `
            <div class="container-custom">
                <div class="flex h-32 items-center justify-between gap-4">
                    <a href="#hero" class="flex min-w-0 items-center gap-3" aria-label="${escapeHtml(brandName)} home">
                        <div class="flex h-12 shrink-0 items-center justify-center">
                            <span class="logo-sweep block dark:hidden">
                                <img
                                    src="${escapeHtml(logo)}"
                                    alt="${escapeHtml(brandName)} logo"
                                    class="jerco-logo h-48 w-auto max-w-[540px] object-contain"
                                    onerror="this.style.display='none';"
                                >
                                <img
                                    src="${escapeHtml(logo)}"
                                    alt=""
                                    aria-hidden="true"
                                    class="logo-sweep-glint h-48 w-auto max-w-[540px] object-contain"
                                >
                            </span>
                            <span class="logo-sweep hidden dark:block">
                                <img
                                    src="${escapeHtml(logoDark)}"
                                    alt="${escapeHtml(brandName)} logo"
                                    class="jerco-logo h-48 w-auto max-w-[540px] object-contain"
                                    onerror="this.style.display='none';"
                                >
                                <img
                                    src="${escapeHtml(logoDark)}"
                                    alt=""
                                    aria-hidden="true"
                                    class="logo-sweep-glint h-48 w-auto max-w-[540px] object-contain"
                                >
                            </span>
                            <span class="hidden h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-sm font-black text-white">J</span>
                        </div>
                    </a>

                    <nav class="hidden items-center gap-3 lg:flex" aria-label="Main navigation">
                        ${buildDesktopNav()}
                    </nav>

                    <div class="hidden items-center gap-2 lg:flex">
                        <button
                            type="button"
                            id="language-toggle"
                            class="icon-button min-w-12 px-3 text-xs font-bold uppercase"
                            aria-label="Switch language"
                            data-current-lang="${escapeHtml(state.currentLanguage)}"
                        >
                            ${state.currentLanguage === 'en' ? 'EN' : 'ID'}
                        </button>

                        <button
                            type="button"
                            id="theme-toggle"
                            class="icon-button"
                            aria-label="Toggle dark mode"
                        >
                            <i id="theme-toggle-dark-icon" class="ph ph-moon text-lg hidden"></i>
                            <i id="theme-toggle-light-icon" class="ph ph-sun text-lg hidden"></i>
                            <i class="ph ph-circle-half text-lg theme-toggle-fallback"></i>
                        </button>

                    </div>

                    <button
                        type="button"
                        id="mobile-menu-button"
                        class="icon-button lg:hidden"
                        aria-label="Open menu"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                    >
                        <i class="ph ph-list text-2xl"></i>
                    </button>
                </div>
            </div>

            <div id="mobile-menu" class="fixed inset-0 z-[60] hidden lg:hidden" aria-hidden="true">
                <button
                    type="button"
                    id="mobile-menu-overlay"
                    class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                    aria-label="Close menu overlay"
                ></button>

                <aside
                    id="mobile-menu-panel"
                    class="absolute right-0 top-0 flex h-full w-[86%] max-w-sm translate-x-full flex-col border-l border-slate-200 bg-white p-5 shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950"
                >
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex min-w-0 items-center gap-3">
                            <div class="flex h-12 shrink-0 items-center justify-center">
                                <span class="logo-sweep block dark:hidden">
                                    <img
                                        src="${escapeHtml(logo)}"
                                        alt="${escapeHtml(brandName)} logo"
                                        class="jerco-logo h-[7.5rem] w-auto max-w-[360px] object-contain"
                                        onerror="this.style.display='none';"
                                    >
                                    <img
                                        src="${escapeHtml(logo)}"
                                        alt=""
                                        aria-hidden="true"
                                        class="logo-sweep-glint h-[7.5rem] w-auto max-w-[360px] object-contain"
                                    >
                                </span>
                                <span class="logo-sweep hidden dark:block">
                                    <img
                                        src="${escapeHtml(logoDark)}"
                                        alt="${escapeHtml(brandName)} logo"
                                        class="jerco-logo h-[7.5rem] w-auto max-w-[360px] object-contain"
                                        onerror="this.style.display='none';"
                                    >
                                    <img
                                        src="${escapeHtml(logoDark)}"
                                        alt=""
                                        aria-hidden="true"
                                        class="logo-sweep-glint h-[7.5rem] w-auto max-w-[360px] object-contain"
                                    >
                                </span>
                            </div>
                        </div>

                        <button type="button" id="mobile-menu-close" class="icon-button" aria-label="Close menu">
                            <i class="ph ph-x text-xl"></i>
                        </button>
                    </div>

                    <nav class="mt-8 flex flex-col gap-2" aria-label="Mobile navigation">
                        ${buildMobileNav()}
                    </nav>

                    <div class="mt-auto space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                        <div class="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                id="mobile-language-toggle"
                                class="btn-secondary text-sm"
                                aria-label="Switch language mobile"
                                data-current-lang="${escapeHtml(state.currentLanguage)}"
                            >
                                <i class="ph ph-translate"></i>
                                <span>${state.currentLanguage === 'en' ? 'English' : 'Indonesia'}</span>
                            </button>

                            <button
                                type="button"
                                id="mobile-theme-toggle"
                                class="btn-secondary text-sm"
                                aria-label="Toggle dark mode mobile"
                            >
                                <i class="ph ph-circle-half"></i>
                                <span>Theme</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        `;
    }

    function renderFloatingWhatsapp() {
        const existing = document.querySelector('#floating-whatsapp');
        if (existing) existing.remove();

        const whatsappUrl = CONTACT.whatsappUrl || '#contact';

        document.body.insertAdjacentHTML('beforeend', `
            <a
                id="floating-whatsapp"
                href="${escapeHtml(whatsappUrl)}"
                target="_blank"
                rel="noopener"
                class="floating-whatsapp"
                aria-label="Contact Jerco via WhatsApp"
            >
                <i class="ph ph-whatsapp-logo"></i>
                <span>WhatsApp</span>
            </a>
        `);
    }

    function renderFooter() {
        const footer = document.querySelector(SELECTORS.footer);
        if (!footer) return;

        const brandName = BRAND.legalName || BRAND.shortName || 'CV Jerco Digital Solusi';
        const logo = BRAND.logo || 'assets/images/logo-jerco.png';
        const logoDark = BRAND.logoDark || 'assets/images/logo-jerco-dark-white-text-soft-shadow.svg';
        const email = CONTACT.email || '';
        const phone = CONTACT.phone || '';
        const whatsappUrl = CONTACT.whatsappUrl || '#contact';
        const websiteUrl = CONTACT.websiteUrl || '#';
        const website = CONTACT.website || '';
        const year = new Date().getFullYear();

        footer.className = 'border-t border-slate-200 bg-slate-950 text-slate-300 dark:border-slate-800';

        footer.innerHTML = `
            <div class="container-custom py-12">
                <div class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
                    <div>
                        <div class="flex items-center">
                            <span class="logo-sweep">
                                <img
                                    src="${escapeHtml(logoDark)}"
                                    alt="${escapeHtml(brandName)} logo"
                                    class="jerco-logo h-[7.5rem] w-auto max-w-[360px] object-contain"
                                    onerror="this.src='${escapeHtml(logo)}';"
                                >
                                <img
                                    src="${escapeHtml(logoDark)}"
                                    alt=""
                                    aria-hidden="true"
                                    class="logo-sweep-glint h-[7.5rem] w-auto max-w-[360px] object-contain"
                                >
                            </span>
                        </div>

                        <p class="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                            IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, and Project Coordination.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold uppercase tracking-wider text-white">Navigation</h3>
                        <div class="mt-4 grid gap-2 text-sm">
                            ${NAVIGATION.map(function (item) {
                                return `<a href="${escapeHtml(item.href)}" class="footer-link">${escapeHtml(getNavigationLabel(item))}</a>`;
                            }).join('')}
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold uppercase tracking-wider text-white">Contact</h3>
                        <div class="mt-4 space-y-3 text-sm">
                            ${email ? `<a href="mailto:${escapeHtml(email)}" class="footer-contact"><i class="ph ph-envelope-simple"></i><span>${escapeHtml(email)}</span></a>` : ''}
                            ${phone ? `<a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener" class="footer-contact"><i class="ph ph-whatsapp-logo"></i><span>${escapeHtml(phone)}</span></a>` : ''}
                            ${website ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener" class="footer-contact"><i class="ph ph-globe"></i><span>${escapeHtml(website)}</span></a>` : ''}
                        </div>
                    </div>
                </div>

                <div class="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                    <p>© ${year} ${escapeHtml(brandName)}. All rights reserved.</p>
                    <p>Built for clean, modular, responsive company profile website.</p>
                </div>
            </div>
        `;
    }

    function openMobileMenu() {
        const menu = document.querySelector(SELECTORS.mobileMenu);
        const panel = document.querySelector(SELECTORS.mobileMenuPanel);
        const button = document.querySelector(SELECTORS.mobileMenuButton);

        if (!menu || !panel) return;

        state.isMobileMenuOpen = true;
        menu.classList.remove('hidden');
        menu.setAttribute('aria-hidden', 'false');
        button?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('overflow-hidden');

        requestAnimationFrame(function () {
            panel.classList.remove('translate-x-full');
            panel.classList.add('translate-x-0');
        });
    }

    function closeMobileMenu() {
        const menu = document.querySelector(SELECTORS.mobileMenu);
        const panel = document.querySelector(SELECTORS.mobileMenuPanel);
        const button = document.querySelector(SELECTORS.mobileMenuButton);

        if (!menu || !panel) return;

        state.isMobileMenuOpen = false;
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
        button?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('overflow-hidden');

        window.setTimeout(function () {
            if (!state.isMobileMenuOpen) {
                menu.classList.add('hidden');
                menu.setAttribute('aria-hidden', 'true');
            }
        }, 280);
    }

    function bindMobileMenuEvents() {
        const openButton = document.querySelector(SELECTORS.mobileMenuButton);
        const closeButton = document.querySelector(SELECTORS.mobileMenuClose);
        const overlay = document.querySelector(SELECTORS.mobileMenuOverlay);
        const mobileLinks = document.querySelectorAll(SELECTORS.mobileNavLink);

        openButton?.addEventListener('click', openMobileMenu);
        closeButton?.addEventListener('click', closeMobileMenu);
        overlay?.addEventListener('click', closeMobileMenu);

        mobileLinks.forEach(function (link) {
            link.addEventListener('click', closeMobileMenu);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && state.isMobileMenuOpen) {
                closeMobileMenu();
            }
        });
    }

    function bindSmoothScrollOffset() {
        const links = document.querySelectorAll(`${SELECTORS.navLink}, ${SELECTORS.mobileNavLink}, a[href^="#"]`);
        const scrollOffset = Number(UI.scrollOffset || 88);

        links.forEach(function (link) {
            link.addEventListener('click', function (event) {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#') || href === '#') return;

                const target = document.querySelector(href);
                if (!target) return;

                event.preventDefault();
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - scrollOffset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                history.pushState(null, '', href);
            });
        });
    }

    function setActiveNavLink(sectionId) {
        if (!sectionId) return;

        const allLinks = document.querySelectorAll(`${SELECTORS.navLink}, ${SELECTORS.mobileNavLink}`);

        allLinks.forEach(function (link) {
            const isActive = link.getAttribute('data-section') === sectionId;
            link.classList.toggle('is-active', isActive);
        });
    }

    function initActiveSectionObserver() {
        const sections = NAVIGATION
            .map(function (item) {
                const href = item.href || '';
                return href.startsWith('#') ? document.querySelector(href) : null;
            })
            .filter(Boolean);

        if (!sections.length || !('IntersectionObserver' in window)) {
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id === 'hero' ? 'home' : entry.target.id;
                    setActiveNavLink(sectionId);
                }
            });
        }, {
            root: null,
            rootMargin: '-30% 0px -55% 0px',
            threshold: 0
        });

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    function syncLanguageButtonLabels() {
        const languageConfig = CONFIG.language || {};
        const storageKey = languageConfig.storageKey || 'jerco-language';
        const currentLang = getStoredLanguage();
        state.currentLanguage = currentLang;

        document.querySelectorAll('#language-toggle').forEach(function (button) {
            button.textContent = currentLang === 'en' ? 'EN' : 'ID';
            button.setAttribute('data-current-lang', currentLang);
        });

        document.querySelectorAll('#mobile-language-toggle').forEach(function (button) {
            button.setAttribute('data-current-lang', currentLang);
            const label = button.querySelector('span');
            if (label) label.textContent = currentLang === 'en' ? 'English' : 'Indonesia';
        });

        try {
            localStorage.setItem(storageKey, currentLang);
        } catch (error) {
            // Ignore storage issue.
        }
    }

    function bindLanguageEvents() {
        document.addEventListener('jerco:language-changed', function () {
            syncLanguageButtonLabels();
            renderHeader();
            renderFooter();
            renderFloatingWhatsapp();
            bindEventsAfterRender();
        });
    }

    function bindThemeProxyEvents() {
        const desktopThemeButton = document.querySelector('#theme-toggle');
        const mobileThemeButton = document.querySelector('#mobile-theme-toggle');

        if (desktopThemeButton && mobileThemeButton) {
            mobileThemeButton.addEventListener('click', function () {
                desktopThemeButton.click();
            });
        }
    }

    function bindLanguageProxyEvents() {
        const desktopLanguageButton = document.querySelector('#language-toggle');
        const mobileLanguageButton = document.querySelector('#mobile-language-toggle');

        if (desktopLanguageButton && mobileLanguageButton) {
            mobileLanguageButton.addEventListener('click', function () {
                desktopLanguageButton.click();
            });
        }
    }

    function bindEventsAfterRender() {
        bindMobileMenuEvents();
        bindSmoothScrollOffset();
        bindThemeProxyEvents();
        bindLanguageProxyEvents();
        initActiveSectionObserver();
        setActiveNavLink('home');
    }

    function initNavigation() {
        renderHeader();
        renderFooter();
        renderFloatingWhatsapp();
        bindEventsAfterRender();
        bindLanguageEvents();

        console.info('[Jerco] navigation.js loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }

    window.JercoNavigation = {
        renderHeader,
        renderFooter,
        renderFloatingWhatsapp,
        openMobileMenu,
        closeMobileMenu,
        setActiveNavLink
    };
})();
