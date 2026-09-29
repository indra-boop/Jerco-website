/*
|--------------------------------------------------------------------------
| JERCO DIGITAL SOLUSI - MAIN JS
|--------------------------------------------------------------------------
| File: js/main.js
| Purpose:
| - General website initialization
| - Basic UX helpers
| - Contact form enhancement
| - SEO/meta sync from SITE_CONFIG
| - Safe dependency checks
|
| Important:
| - Do not put API keys in this file.
| - Keep feature-specific logic in its own file when possible.
| - main.js should run after config.js, navigation.js, theme.js,
|   language.js.
*/

(function () {
    'use strict';

    const APP_NAME = 'JercoWebsite';
    const VERSION = '1.0.0';

    const state = {
        initialized: false,
        observers: []
    };

    const SELECTORS = {
        contactForm: '#contact-form',
        currentYear: '[data-current-year], #current-year',
        externalLinks: 'a[target="_blank"]',
        images: 'img',
        revealItems: '.card, .service-card, .section-title, .section-description, .contact-item'
    };

    function getConfig(path, fallback = null) {
        if (typeof window.getSiteConfig === 'function') {
            return window.getSiteConfig(path, fallback);
        }

        if (!window.SITE_CONFIG) return fallback;
        if (!path) return window.SITE_CONFIG;

        return path.split('.').reduce(function (current, key) {
            return current && Object.prototype.hasOwnProperty.call(current, key)
                ? current[key]
                : fallback;
        }, window.SITE_CONFIG);
    }

    function debounce(callback, delay = 120) {
        let timer = null;

        return function debounced() {
            const args = arguments;
            const context = this;

            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                callback.apply(context, args);
            }, delay);
        };
    }

    function throttle(callback, delay = 120) {
        let waiting = false;

        return function throttled() {
            if (waiting) return;

            waiting = true;
            const args = arguments;
            const context = this;

            window.setTimeout(function () {
                callback.apply(context, args);
                waiting = false;
            }, delay);
        };
    }

    function isElement(value) {
        return value instanceof Element || value instanceof HTMLDocument;
    }

    function safeQuery(selector, parent = document) {
        if (!selector || !isElement(parent)) return null;
        return parent.querySelector(selector);
    }

    function safeQueryAll(selector, parent = document) {
        if (!selector || !isElement(parent)) return [];
        return Array.from(parent.querySelectorAll(selector));
    }

    function setMetaTag(selector, attributeName, value) {
        if (!value) return;

        let tag = safeQuery(selector);

        if (!tag) {
            tag = document.createElement('meta');

            if (selector.includes('property=')) {
                const property = selector.match(/property="([^"]+)"/)?.[1];
                if (property) tag.setAttribute('property', property);
            } else if (selector.includes('name=')) {
                const name = selector.match(/name="([^"]+)"/)?.[1];
                if (name) tag.setAttribute('name', name);
            }

            document.head.appendChild(tag);
        }

        tag.setAttribute(attributeName, value);
    }

    function initMetaFromConfig() {
        // Page ships its own static SEO meta (see language.js updateMeta).
        if (document.body && document.body.dataset.i18nMeta) return;

        const title = getConfig('seo.title', getConfig('brand.legalName', 'CV Jerco Digital Solusi'));
        const description = getConfig('seo.description', getConfig('brand.description', ''));
        const keywords = getConfig('seo.keywords', []);
        const websiteUrl = getConfig('contact.websiteUrl', '');
        const ogImage = getConfig('brand.logo', '');
        const themeColor = getConfig('theme.metaColor', '#0F3C5C');

        if (title) document.title = title;

        setMetaTag('meta[name="description"]', 'content', description);
        setMetaTag('meta[name="keywords"]', 'content', Array.isArray(keywords) ? keywords.join(', ') : keywords);
        setMetaTag('meta[name="theme-color"]', 'content', themeColor);
        setMetaTag('meta[property="og:title"]', 'content', title);
        setMetaTag('meta[property="og:description"]', 'content', description);
        setMetaTag('meta[property="og:url"]', 'content', websiteUrl);
        setMetaTag('meta[property="og:image"]', 'content', ogImage);
    }

    function initExternalLinks() {
        safeQueryAll(SELECTORS.externalLinks).forEach(function (link) {
            const currentRel = link.getAttribute('rel') || '';
            const relParts = new Set(currentRel.split(' ').filter(Boolean));

            relParts.add('noopener');
            relParts.add('noreferrer');

            link.setAttribute('rel', Array.from(relParts).join(' '));
        });
    }

    function initCurrentYear() {
        const year = new Date().getFullYear().toString();

        safeQueryAll(SELECTORS.currentYear).forEach(function (element) {
            element.textContent = year;
        });
    }

    function initImageFallbacks() {
        safeQueryAll(SELECTORS.images).forEach(function (image) {
            if (image.dataset.fallbackBound === 'true') return;
            image.dataset.fallbackBound = 'true';

            image.addEventListener('error', function () {
                const alt = image.getAttribute('alt') || 'Image unavailable';
                const wrapper = document.createElement('div');

                wrapper.className = image.className || '';
                wrapper.classList.add(
                    'flex',
                    'min-h-48',
                    'items-center',
                    'justify-center',
                    'rounded-2xl',
                    'border',
                    'border-slate-200',
                    'bg-slate-100',
                    'p-6',
                    'text-center',
                    'text-sm',
                    'font-medium',
                    'text-slate-500',
                    'dark:border-slate-700',
                    'dark:bg-slate-800',
                    'dark:text-slate-300'
                );
                wrapper.textContent = alt;

                image.replaceWith(wrapper);
            });
        });
    }

    function buildContactMessage(formData) {
        const brandName = getConfig('brand.shortName', 'Jerco Digital Solusi');
        const lines = [
            'Halo ' + brandName + ',',
            '',
            'Saya ingin konsultasi project.',
            '',
            'Nama: ' + (formData.get('name') || '-'),
            'Phone/WA: ' + (formData.get('phone') || '-'),
            'Email: ' + (formData.get('email') || '-'),
            'Layanan: ' + (formData.get('service') || '-'),
            '',
            'Kebutuhan:',
            formData.get('message') || '-'
        ];

        return lines.join('\n');
    }

    function showFormNotice(form, message, type = 'info') {
        if (!form) return;

        let notice = form.querySelector('[data-form-notice]');

        if (!notice) {
            notice = document.createElement('p');
            notice.setAttribute('data-form-notice', 'true');
            notice.className = 'rounded-xl px-4 py-3 text-sm font-medium';
            form.appendChild(notice);
        }

        const classes = {
            info: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
            success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
            warning: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
            error: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        };

        notice.className = 'rounded-xl px-4 py-3 text-sm font-medium ' + (classes[type] || classes.info);
        notice.textContent = message;
    }

    function initContactForm() {
        const form = safeQuery(SELECTORS.contactForm);
        if (!form || form.dataset.mainBound === 'true') return;

        form.dataset.mainBound = 'true';

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const email = getConfig('contact.email', 'indra@jerconetwork.com');
            const whatsappUrl = getConfig('contact.whatsappUrl', '');
            const message = buildContactMessage(formData);
            const submitMode = form.getAttribute('data-submit-mode') || 'mailto';

            if (submitMode === 'whatsapp' && whatsappUrl) {
                const url = whatsappUrl + '?text=' + encodeURIComponent(message);
                window.open(url, '_blank', 'noopener,noreferrer');
                showFormNotice(form, 'Inquiry dibuka via WhatsApp. Silakan kirim pesan dari tab baru.', 'success');
                return;
            }

            const subject = 'Website Inquiry - ' + (formData.get('service') || 'Project Consultation');
            const mailtoUrl = 'mailto:' + encodeURIComponent(email) +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(message);

            window.location.href = mailtoUrl;
            showFormNotice(form, 'Email draft dibuka. Kalau tidak muncul, coba hubungi via WhatsApp.', 'info');
        });
    }

    function initRevealObserver() {
        if (!('IntersectionObserver' in window)) return;

        const targets = safeQueryAll(SELECTORS.revealItems).filter(function (element) {
            return element.dataset.revealBound !== 'true';
        });

        if (!targets.length) return;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                entry.target.classList.add('is-visible');
                entry.target.classList.remove('opacity-0', 'translate-y-4');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -60px 0px'
        });

        targets.forEach(function (element) {
            element.dataset.revealBound = 'true';
            element.classList.add('transition', 'duration-500', 'ease-out', 'opacity-0', 'translate-y-4');
            observer.observe(element);
        });

        state.observers.push(observer);
    }

    function observeDynamicEnhancements() {
        const observer = new MutationObserver(debounce(function () {
            initExternalLinks();
            initImageFallbacks();
            initCurrentYear();
            initRevealObserver();
        }, 120));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        state.observers.push(observer);
    }

    function checkDependencies() {
        const checks = [
            ['SITE_CONFIG', Boolean(window.SITE_CONFIG)],
            ['JercoNavigation', Boolean(window.JercoNavigation)],
            ['JercoTheme', Boolean(window.JercoTheme)],
            ['JercoLanguage', Boolean(window.JercoLanguage)],
            ['JercoAIAssistant', Boolean(window.JercoAIAssistant)]
        ];

        const missing = checks
            .filter(function (item) { return !item[1]; })
            .map(function (item) { return item[0]; });

        if (missing.length) {
            console.warn('[Jerco] Missing optional dependencies:', missing.join(', '));
        }
    }

    function dispatchReadyEvent() {
        window.dispatchEvent(new CustomEvent('jerco:main-ready', {
            detail: {
                app: APP_NAME,
                version: VERSION,
                config: getConfig(null, {})
            }
        }));
    }

    function refresh() {
        initMetaFromConfig();
        initExternalLinks();
        initCurrentYear();
        initImageFallbacks();
        initContactForm();
        initRevealObserver();
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;

        document.documentElement.classList.add('js-ready');

        checkDependencies();
        refresh();
        observeDynamicEnhancements();
        dispatchReadyEvent();

        console.info('[Jerco] main.js loaded:', VERSION);
    }

    function destroy() {
        state.observers.forEach(function (observer) {
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        });

        state.observers = [];
        state.initialized = false;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.JercoApp = {
        init,
        refresh,
        destroy,
        getConfig,
        debounce,
        throttle,
        version: VERSION
    };
})();
