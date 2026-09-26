/*
|--------------------------------------------------------------------------
| JERCO DIGITAL SOLUSI - SITE CONFIG
|--------------------------------------------------------------------------
| File: js/config.js
| Purpose:
| - Tailwind CDN configuration
| - Global brand/contact configuration
| - Navigation menu data
| - Social/contact links
| - AI assistant endpoint placeholder
|
| Important:
| - Do not put API keys in this file.
| - AI integration must go through backend/API endpoint.
| - Keep this file loaded before other custom JS files.
*/

(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * Tailwind CDN Config
     * ------------------------------------------------------------------ */
    window.tailwind = window.tailwind || {};

    window.tailwind.config = {
        darkMode: 'class',
        theme: {
            extend: {
                colors: {
                    jerco: {
                        navy: '#0F3C5C',
                        blue: '#1BA0D7',
                        cyan: '#22D3EE',
                        orange: '#F97316',
                        dark: '#082032',
                        soft: '#EAF6FB'
                    }
                },
                fontFamily: {
                    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
                },
                boxShadow: {
                    soft: '0 18px 45px rgba(15, 23, 42, 0.08)',
                    glow: '0 0 35px rgba(34, 211, 238, 0.25)'
                },
                borderRadius: {
                    '2xl': '1.25rem',
                    '3xl': '1.75rem'
                }
            }
        }
    };

    /* ------------------------------------------------------------------
     * Global Site Config
     * ------------------------------------------------------------------ */
    window.SITE_CONFIG = {
        project: {
            name: 'Website Jerco Digital Solusi',
            type: 'Company Profile / Landing Page / Portfolio Online',
            version: '1.0.0',
            status: 'development'
        },

        brand: {
            legalName: 'CV Jerco Digital Solusi',
            shortName: 'Jerco Digital Solusi',
            tagline: 'IT & Telecommunication Infrastructure Partner',
            description: 'IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, and Project Coordination.',
            logo: '/assets/images/logo-jerco.png',
            logoDark: '/assets/images/logo-jerco-dark-white-text-soft-shadow.svg',
            favicon: '/assets/icons/favicon.png'
        },

        contact: {
            email: 'indra@jerconetwork.com',
            phone: '+62 822-3765-0909',
            whatsapp: '+6282237650909',
            whatsappUrl: 'https://wa.me/6282237650909',
            website: 'www.jerconetwork.com',
            websiteUrl: 'https://www.jerconetwork.com',
            location: 'Bali, Indonesia'
        },

        theme: {
            defaultTheme: 'light',
            storageKey: 'color-theme',
            enableDarkMode: true
        },

        language: {
            defaultLanguage: 'id',
            storageKey: 'jerco-language',
            supported: ['id', 'en'],
            contentPath: {
                id: '/data/content-id.json',
                en: '/data/content-en.json'
            }
        },

        assets: {
            images: {
                logo: '/assets/images/logo-jerco.png',
                logoDark: '/assets/images/logo-jerco-dark-white-text-soft-shadow.svg',
                hero: 'assets/images/hero-bg.png',
                profile: 'assets/images/profile.jpg',
                projectIsp: 'assets/images/projects/project-isp.png',
                projectCloud: 'assets/images/projects/project-cloud.png',
                projectDashboard: 'assets/images/projects/project-dashboard.png'
            },
            documents: {
                companyProfile: 'assets/documents/company-profile.pdf',
                portfolio: 'assets/documents/portfolio.pdf'
            }
        },

        navigation: [
            {
                id: 'home',
                labelId: 'Beranda',
                labelEn: 'Home',
                href: '#hero'
            },
            {
                id: 'about',
                labelId: 'Tentang',
                labelEn: 'About',
                href: '#about'
            },
            {
                id: 'services',
                labelId: 'Layanan',
                labelEn: 'Services',
                href: '#services',
                children: [
                    {
                        id: 'services-overview',
                        labelId: 'Semua Layanan',
                        labelEn: 'All Services',
                        href: '#services',
                        icon: 'ph-squares-four'
                    },
                    {
                        id: 'permits-licensing',
                        labelId: 'Perizinan & Lisensi',
                        labelEn: 'Permits & Licensing',
                        href: '/services/permits-licensing/',
                        icon: 'ph-stamp'
                    }
                ]
            },
            {
                id: 'portfolio',
                labelId: 'Portfolio',
                labelEn: 'Portfolio',
                href: '#portfolio'
            },
            {
                id: 'process',
                labelId: 'Workflow',
                labelEn: 'Workflow',
                href: '#process'
            },
            {
                id: 'schedule',
                labelId: 'Jadwal',
                labelEn: 'Schedule',
                titleId: 'Jadwal siaran olahraga (buka di tab baru)',
                titleEn: 'Sports broadcast schedule (opens in new tab)',
                href: 'https://schedule.jerconetwork.com',
                external: true,
                icon: 'ph-arrow-up-right'
            },
            {
                id: 'contact',
                labelId: 'Kontak',
                labelEn: 'Contact',
                href: '#contact'
            }
        ],

        services: [
            {
                id: 'network-infrastructure',
                icon: 'ph-wifi-high',
                titleId: 'Network Infrastructure',
                titleEn: 'Network Infrastructure'
            },
            {
                id: 'fiber-optic-osp',
                icon: 'ph-git-branch',
                titleId: 'Fiber Optic / OSP',
                titleEn: 'Fiber Optic / OSP'
            },
            {
                id: 'cctv-security',
                icon: 'ph-video-camera',
                titleId: 'CCTV & Security System',
                titleEn: 'CCTV & Security System'
            },
            {
                id: 'cloud-devops',
                icon: 'ph-cloud',
                titleId: 'Cloud / VPS / DevOps',
                titleEn: 'Cloud / VPS / DevOps'
            },
            {
                id: 'technical-documentation',
                icon: 'ph-file-text',
                titleId: 'Technical Documentation',
                titleEn: 'Technical Documentation'
            },
            {
                id: 'kmz-kml-route-analysis',
                icon: 'ph-map-trifold',
                titleId: 'KMZ/KML Route Analysis',
                titleEn: 'KMZ/KML Route Analysis'
            }
        ],

        aiAssistant: {
            enabled: false,
            endpoint: '/api/ai-assistant',
            modelLabel: 'Jerco AI Assistant',
            maxMessageLength: 1000,
            disclaimer: 'AI assistant is a frontend placeholder. Backend/API integration must be configured separately. Do not expose API keys in frontend files.'
        },

        seo: {
            title: 'CV Jerco Digital Solusi | IT & Telecommunication Infrastructure Partner',
            description: 'IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, and Project Coordination.',
            keywords: [
                'Jerco Digital Solusi',
                'IT Consultant',
                'Fiber Optic',
                'OSP',
                'Network Infrastructure',
                'CCTV',
                'Cloud',
                'DevOps',
                'BOQ',
                'RAB',
                'KMZ',
                'KML',
                'Permit Support'
            ]
        },

        ui: {
            header: {
                sticky: true,
                blur: true
            },
            animation: {
                enabled: true,
                duration: 250
            },
            scrollOffset: 88
        }
    };

    /* ------------------------------------------------------------------
     * Global Helper Alias
     * ------------------------------------------------------------------ */
    window.getSiteConfig = function getSiteConfig(path, fallback = null) {
        if (!path) return window.SITE_CONFIG;

        return path
            .split('.')
            .reduce(function (current, key) {
                return current && Object.prototype.hasOwnProperty.call(current, key)
                    ? current[key]
                    : fallback;
            }, window.SITE_CONFIG);
    };

    console.info('[Jerco] config.js loaded:', window.SITE_CONFIG.project.version);
})();
