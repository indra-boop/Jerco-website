/*
|--------------------------------------------------------------------------
| JERCO DIGITAL SOLUSI - LANGUAGE HANDLER
|--------------------------------------------------------------------------
| File: js/language.js
| Purpose:
| - Handle ID/EN language switching
| - Load content from data/content-id.json and data/content-en.json when available
| - Apply text to elements with data-i18n attributes
| - Persist selected language in localStorage
|
| Dependency:
| - js/config.js must be loaded before this file
|
| Note:
| - This file contains safe fallback content so the website still works
|   even before JSON content files are created.
*/

(function () {
    'use strict';

    const CONFIG = window.SITE_CONFIG || {};
    const LANGUAGE_CONFIG = CONFIG.language || {};
    const STORAGE_KEY = LANGUAGE_CONFIG.storageKey || 'jerco-language';
    const DEFAULT_LANGUAGE = LANGUAGE_CONFIG.defaultLanguage || 'id';
    const SUPPORTED_LANGUAGES = Array.isArray(LANGUAGE_CONFIG.supported)
        ? LANGUAGE_CONFIG.supported
        : ['id', 'en'];

    const SELECTORS = {
        text: '[data-i18n]',
        html: '[data-i18n-html]',
        placeholder: '[data-i18n-placeholder]',
        title: '[data-i18n-title]',
        ariaLabel: '[data-i18n-aria-label]',
        toggle: [
            '#language-toggle',
            '#mobile-language-toggle',
            '[data-language-toggle]'
        ].join(','),
        setLanguage: '[data-set-language]',
        currentLanguage: '[data-current-language]'
    };

    const FALLBACK_CONTENT = {
        id: {
            meta: {
                title: 'CV Jerco Digital Solusi | Partner Infrastruktur IT & Telekomunikasi',
                description: 'IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, dan Project Coordination.'
            },
            nav: {
                home: 'Beranda',
                about: 'Tentang',
                services: 'Layanan',
                portfolio: 'Portfolio',
                process: 'Workflow',
                contact: 'Kontak'
            },
            hero: {
                badge: 'IT & TELECOMMUNICATION INFRASTRUCTURE PARTNER',
                title: 'Solusi End-to-End Infrastruktur IT & Telekomunikasi',
                subtitle: 'Jerco Digital Solusi adalah mitra terpercaya bagi perusahaan, ISP, dan project owner dalam mewujudkan infrastruktur jaringan yang andal. Kami menghadirkan layanan menyeluruh\u2014mulai dari perizinan & akuisisi lahan (SITAC), perencanaan teknis, instalasi fisik, sistem integrasi, hingga managed service untuk performa jangka panjang.',
                ctaPrimary: 'Request Survey',
                ctaSecondary: 'Contact via WhatsApp'
            },
            about: {
                badge: 'Tentang Jerco',
                title: 'Partner teknis untuk project digital dan infrastruktur.',
                description: 'Jerco Digital Solusi membantu bisnis dalam perencanaan teknis, deployment infrastruktur, dokumentasi, dan koordinasi project IT serta telekomunikasi.',
                point1Title: 'Perencanaan Akurat',
                point1Text: 'Survey, route analysis, BOQ/RAB, dan technical documentation dengan logic project yang jelas.',
                point2Title: 'Koordinasi Andal',
                point2Text: 'Koordinasi vendor, client, permit, dan lapangan untuk mengurangi miskomunikasi dan risiko project.'
            },
            services: {
                badge: 'Layanan',
                title: 'Core Services',
                description: 'Dukungan end-to-end untuk IT, network, fiber optic, dokumentasi, dan koordinasi project.',
                item1Title: 'Network Infrastructure',
                item1Text: 'LAN, WiFi, router, switch, rack, dan structured network deployment.',
                item2Title: 'Fiber Optic / OSP',
                item2Text: 'Dukungan route FO aerial dan underground, OSP survey, dan route validation.',
                item3Title: 'CCTV & Security System',
                item3Text: 'IP CCTV, NVR, monitoring, dan dukungan instalasi security infrastructure.',
                item4Title: 'Cloud / VPS / DevOps',
                item4Text: 'Server setup, VPS deployment, basic DevOps, hosting, dan system maintenance.',
                item5Title: 'Technical Documentation',
                item5Text: 'Technical report, BOQ/RAB, as-plan/as-built support, dan project documentation.',
                item6Title: 'KMZ/KML Route Analysis',
                item6Text: 'Route mapping, distance calculation, point marking, dan route data untuk permit support.',
                item7Title: 'Sports Schedule',
                item7Text: 'Dashboard jadwal siaran olahraga live untuk bar, hotel, dan venue, update otomatis.',
                item7Link: 'Buka schedule.jerconetwork.com'
            },
            portfolio: {
                badge: 'Portfolio',
                title: 'Kategori Project',
                description: 'Beberapa kategori pekerjaan yang didukung Jerco Digital Solusi di bidang IT dan telekomunikasi.',
                item1Title: 'ISP / Fiber Optic',
                item1Text: 'OSP route, FO deployment, route analysis, dan technical support.',
                item2Title: 'Cloud / Server',
                item2Text: 'VPS setup, web hosting, backup, dan monitoring support.',
                item3Title: 'Dashboard System',
                item3Text: 'Data visualization, operational dashboard, dan reporting tools.'
            },
            process: {
                badge: 'Workflow',
                title: 'Alur Project Sederhana',
                step1Title: 'Survey',
                step1Text: 'Ambil data site, existing condition, route, dan kebutuhan client.',
                step2Title: 'Design',
                step2Text: 'Siapkan topology, route plan, technical notes, dan BOQ/RAB.',
                step3Title: 'Deploy',
                step3Text: 'Koordinasi eksekusi lapangan, vendor, permit, dan progress instalasi.',
                step4Title: 'Report',
                step4Text: 'Deliver dokumentasi, progress report, dan handover support.'
            },
            contact: {
                badge: 'Kontak',
                title: 'Diskusikan project Anda dengan Jerco.',
                description: 'Kirim kebutuhan project, lokasi site, drawing, BOQ, route KMZ/KML, atau kendala teknis untuk direview.',
                nameLabel: 'Nama',
                phoneLabel: 'Telepon / WhatsApp',
                emailLabel: 'Email',
                serviceLabel: 'Layanan Dibutuhkan',
                messageLabel: 'Pesan',
                submitButton: 'Kirim Inquiry'
            }
        },

        en: {
            meta: {
                title: 'CV Jerco Digital Solusi | IT & Telecommunication Infrastructure Partner',
                description: 'IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, and Project Coordination.'
            },
            nav: {
                home: 'Home',
                about: 'About',
                services: 'Services',
                portfolio: 'Portfolio',
                process: 'Workflow',
                contact: 'Contact'
            },
            hero: {
                badge: 'IT & TELECOMMUNICATION INFRASTRUCTURE PARTNER',
                title: 'IT, Network, Fiber Optic, and Technical Documentation Solutions',
                subtitle: 'Fiber Optic, Network Infrastructure, CCTV, Technical Documentation, and Permit Support Services for business, hotel, office, ISP, contractor, and government-related project coordination.',
                ctaPrimary: 'Request Survey',
                ctaSecondary: 'Contact via WhatsApp'
            },
            about: {
                badge: 'About Jerco',
                title: 'Technical partner for digital and infrastructure projects.',
                description: 'Jerco Digital Solusi supports businesses with technical planning, infrastructure deployment, documentation, and coordination for IT and telecommunication projects.',
                point1Title: 'Accurate Planning',
                point1Text: 'Survey, route analysis, BOQ/RAB, and technical documentation with clear project logic.',
                point2Title: 'Reliable Coordination',
                point2Text: 'Vendor, client, permit, and field coordination to reduce miscommunication and project risk.'
            },
            services: {
                badge: 'Services',
                title: 'Core Services',
                description: 'End-to-end support for IT, network, fiber optic, documentation, and project coordination.',
                item1Title: 'Network Infrastructure',
                item1Text: 'LAN, WiFi, router, switch, rack, and structured network deployment.',
                item2Title: 'Fiber Optic / OSP',
                item2Text: 'Aerial and underground FO route support, OSP survey, and route validation.',
                item3Title: 'CCTV & Security System',
                item3Text: 'IP CCTV, NVR, monitoring, and security infrastructure installation support.',
                item4Title: 'Cloud / VPS / DevOps',
                item4Text: 'Server setup, VPS deployment, basic DevOps, hosting, and system maintenance.',
                item5Title: 'Technical Documentation',
                item5Text: 'Technical report, BOQ/RAB, as-plan/as-built support, and project documentation.',
                item6Title: 'KMZ/KML Route Analysis',
                item6Text: 'Route mapping, distance calculation, point marking, and permit-supporting route data.',
                item7Title: 'Sports Schedule',
                item7Text: 'Live sports broadcast schedule dashboard for bars, hotels, and venues, updated automatically.',
                item7Link: 'Open schedule.jerconetwork.com'
            },
            portfolio: {
                badge: 'Portfolio',
                title: 'Project Categories',
                description: 'Selected work categories supported by Jerco Digital Solusi across IT and telecommunication projects.',
                item1Title: 'ISP / Fiber Optic',
                item1Text: 'OSP route, FO deployment, route analysis, and technical support.',
                item2Title: 'Cloud / Server',
                item2Text: 'VPS setup, web hosting, backup, and monitoring support.',
                item3Title: 'Dashboard System',
                item3Text: 'Data visualization, operational dashboard, and reporting tools.'
            },
            process: {
                badge: 'Workflow',
                title: 'Simple Project Flow',
                step1Title: 'Survey',
                step1Text: 'Collect site data, existing condition, route, and client requirements.',
                step2Title: 'Design',
                step2Text: 'Prepare topology, route plan, technical notes, and BOQ/RAB.',
                step3Title: 'Deploy',
                step3Text: 'Coordinate field execution, vendor, permit, and installation progress.',
                step4Title: 'Report',
                step4Text: 'Deliver documentation, progress report, and handover support.'
            },
            contact: {
                badge: 'Contact',
                title: 'Discuss your project with Jerco.',
                description: 'Send your project requirement, site location, drawing, BOQ, route KMZ/KML, or technical issue for review.',
                nameLabel: 'Name',
                phoneLabel: 'Phone / WhatsApp',
                emailLabel: 'Email',
                serviceLabel: 'Service Needed',
                messageLabel: 'Message',
                submitButton: 'Send Inquiry'
            }
        }
    };

    const state = {
        currentLanguage: DEFAULT_LANGUAGE,
        content: FALLBACK_CONTENT[DEFAULT_LANGUAGE] || {},
        cache: {},
        initialized: false,
        isApplying: false,
        observer: null
    };

    function isSupportedLanguage(language) {
        return SUPPORTED_LANGUAGES.includes(language);
    }

    function getStoredLanguage() {
        let storedLanguage = null;

        try {
            storedLanguage = localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            storedLanguage = null;
        }

        if (storedLanguage && isSupportedLanguage(storedLanguage)) {
            return storedLanguage;
        }

        const htmlLanguage = document.documentElement.getAttribute('lang');
        if (htmlLanguage && isSupportedLanguage(htmlLanguage)) {
            return htmlLanguage;
        }

        return isSupportedLanguage(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : SUPPORTED_LANGUAGES[0];
    }

    function setStoredLanguage(language) {
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch (error) {
            // Ignore storage issue.
        }
    }

    function deepMerge(target, source) {
        const output = Object.assign({}, target || {});

        Object.keys(source || {}).forEach(function (key) {
            const sourceValue = source[key];
            const targetValue = output[key];

            if (
                sourceValue &&
                typeof sourceValue === 'object' &&
                !Array.isArray(sourceValue) &&
                targetValue &&
                typeof targetValue === 'object' &&
                !Array.isArray(targetValue)
            ) {
                output[key] = deepMerge(targetValue, sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });

        return output;
    }

    function getValueByPath(object, path, fallback = '') {
        if (!object || !path) return fallback;

        return path.split('.').reduce(function (current, key) {
            if (current && Object.prototype.hasOwnProperty.call(current, key)) {
                return current[key];
            }
            return undefined;
        }, object) ?? fallback;
    }

    function getContentPath(language) {
        const contentPath = LANGUAGE_CONFIG.contentPath || {};
        return contentPath[language] || `data/content-${language}.json`;
    }

    async function loadContent(language) {
        const fallbackContent = FALLBACK_CONTENT[language] || FALLBACK_CONTENT[DEFAULT_LANGUAGE] || {};

        if (state.cache[language]) {
            return state.cache[language];
        }

        // Opening via file:// often blocks fetch JSON. Fallback keeps the site working.
        if (window.location.protocol === 'file:') {
            state.cache[language] = fallbackContent;
            return fallbackContent;
        }

        try {
            const response = await fetch(getContentPath(language), {
                cache: 'no-cache',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Content file not found: ${response.status}`);
            }

            const jsonContent = await response.json();
            const mergedContent = deepMerge(fallbackContent, jsonContent);
            state.cache[language] = mergedContent;
            return mergedContent;
        } catch (error) {
            console.warn(`[Jerco] language fallback used for ${language}:`, error.message);
            state.cache[language] = fallbackContent;
            return fallbackContent;
        }
    }

    function updateMeta(content) {
        // Sub-pages set <body data-i18n-meta="permitsPage.meta"> so the homepage
        // meta never overwrites their own title/description.
        const scopedMetaPath = document.body ? document.body.dataset.i18nMeta : '';
        const meta = scopedMetaPath
            ? getValueByPath(content, scopedMetaPath, {}) || {}
            : (content.meta || {});

        if (meta.title) {
            document.title = meta.title;
        }

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && meta.description) {
            metaDescription.setAttribute('content', meta.description);
        }

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && meta.title) {
            ogTitle.setAttribute('content', meta.title);
        }

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription && meta.description) {
            ogDescription.setAttribute('content', meta.description);
        }
    }

    function applyTextContent(content) {
        document.querySelectorAll(SELECTORS.text).forEach(function (element) {
            const key = element.getAttribute('data-i18n');
            const value = getValueByPath(content, key, null);

            if (value !== null && value !== undefined) {
                element.textContent = value;
            }
        });

        document.querySelectorAll(SELECTORS.html).forEach(function (element) {
            const key = element.getAttribute('data-i18n-html');
            const value = getValueByPath(content, key, null);

            if (value !== null && value !== undefined) {
                element.innerHTML = value;
            }
        });

        document.querySelectorAll(SELECTORS.placeholder).forEach(function (element) {
            const key = element.getAttribute('data-i18n-placeholder');
            const value = getValueByPath(content, key, null);

            if (value !== null && value !== undefined) {
                element.setAttribute('placeholder', value);
            }
        });

        document.querySelectorAll(SELECTORS.title).forEach(function (element) {
            const key = element.getAttribute('data-i18n-title');
            const value = getValueByPath(content, key, null);

            if (value !== null && value !== undefined) {
                element.setAttribute('title', value);
            }
        });

        document.querySelectorAll(SELECTORS.ariaLabel).forEach(function (element) {
            const key = element.getAttribute('data-i18n-aria-label');
            const value = getValueByPath(content, key, null);

            if (value !== null && value !== undefined) {
                element.setAttribute('aria-label', value);
            }
        });
    }

    function updateLanguageControls(language) {
        const isEnglish = language === 'en';
        const desktopLabel = isEnglish ? 'EN' : 'ID';
        const mobileLabel = isEnglish ? 'English' : 'Indonesia';

        document.querySelectorAll(SELECTORS.toggle).forEach(function (button) {
            button.setAttribute('data-current-lang', language);
            button.setAttribute('aria-label', isEnglish ? 'Switch to Indonesian' : 'Switch to English');
            button.setAttribute('title', isEnglish ? 'Switch to Indonesian' : 'Switch to English');

            if (button.id === 'language-toggle') {
                button.textContent = desktopLabel;
                return;
            }

            const label = button.querySelector('span');
            if (label) {
                label.textContent = mobileLabel;
            } else if (!button.querySelector('i')) {
                button.textContent = desktopLabel;
            }
        });

        document.querySelectorAll(SELECTORS.currentLanguage).forEach(function (element) {
            element.textContent = desktopLabel;
        });
    }

    function dispatchLanguageChange(language, content) {
        window.dispatchEvent(new CustomEvent('jerco:language-changed', {
            detail: {
                language: language,
                content: content
            }
        }));
    }

    async function setLanguage(language, options = {}) {
        const nextLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;

        state.isApplying = true;

        const content = await loadContent(nextLanguage);
        state.currentLanguage = nextLanguage;
        state.content = content;

        document.documentElement.setAttribute('lang', nextLanguage);
        document.documentElement.setAttribute('data-language', nextLanguage);

        if (options.persist !== false) {
            setStoredLanguage(nextLanguage);
        }

        updateMeta(content);
        applyTextContent(content);
        updateLanguageControls(nextLanguage);

        state.isApplying = false;

        if (options.silent !== true) {
            dispatchLanguageChange(nextLanguage, content);
        }

        return nextLanguage;
    }

    function getCurrentLanguage() {
        return state.currentLanguage || getStoredLanguage();
    }

    function getNextLanguage() {
        const currentLanguage = getCurrentLanguage();
        const currentIndex = SUPPORTED_LANGUAGES.indexOf(currentLanguage);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % SUPPORTED_LANGUAGES.length : 0;
        return SUPPORTED_LANGUAGES[nextIndex];
    }

    function toggleLanguage() {
        return setLanguage(getNextLanguage());
    }

    function bindLanguageControls() {
        document.querySelectorAll(SELECTORS.toggle).forEach(function (button) {
            if (button.dataset.languageBound === 'true') return;

            button.dataset.languageBound = 'true';
            button.addEventListener('click', function () {
                toggleLanguage();
            });
        });

        document.querySelectorAll(SELECTORS.setLanguage).forEach(function (button) {
            if (button.dataset.languageSetBound === 'true') return;

            button.dataset.languageSetBound = 'true';
            button.addEventListener('click', function () {
                const targetLanguage = button.getAttribute('data-set-language');
                setLanguage(targetLanguage);
            });
        });
    }

    function observeDynamicContent() {
        if (state.observer) return;

        let timer = null;

        state.observer = new MutationObserver(function () {
            if (state.isApplying) return;

            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                bindLanguageControls();
                updateLanguageControls(getCurrentLanguage());
                applyTextContent(state.content);
            }, 80);
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function initLanguage() {
        if (state.initialized) return;
        state.initialized = true;

        const initialLanguage = getStoredLanguage();

        bindLanguageControls();
        await setLanguage(initialLanguage, { persist: true, silent: true });
        observeDynamicContent();

        console.info('[Jerco] language.js loaded:', initialLanguage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguage);
    } else {
        initLanguage();
    }

    window.JercoLanguage = {
        init: initLanguage,
        set: setLanguage,
        toggle: toggleLanguage,
        get: getCurrentLanguage,
        getContent: function getContent() {
            return state.content;
        },
        getValue: function getValue(path, fallback = '') {
            return getValueByPath(state.content, path, fallback);
        },
        reload: function reload() {
            state.cache = {};
            return setLanguage(getCurrentLanguage(), { persist: true });
        }
    };
})();
