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
        dropdown: '[data-nav-dropdown]',
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

    function getNavigationTitle(item) {
        if (state.currentLanguage === 'en') {
            return item.titleEn || item.titleId || '';
        }

        return item.titleId || item.titleEn || '';
    }

    function isExternal(item) {
        return item.external === true || /^https?:\/\//i.test(item.href || '');
    }

    function getChildren(item) {
        return Array.isArray(item.children) ? item.children : [];
    }

    // All nav items incl. children, flattened (for label updates).
    function getAllNavItems() {
        return NAVIGATION.reduce(function (all, item) {
            return all.concat([item], getChildren(item));
        }, []);
    }

    // Sub-pages declare their menu position on <body>:
    // <body data-nav-active="permits-licensing" data-nav-parent="services">
    function getPageNavContext() {
        const body = document.body || { dataset: {} };
        return {
            active: body.dataset.navActive || '',
            parent: body.dataset.navParent || ''
        };
    }

    // On sub-pages, homepage anchors (#services) must point back to "/#services".
    function resolveHref(href) {
        const value = String(href || '');
        if (value.charAt(0) === '#' && getPageNavContext().active) {
            return '/' + value;
        }
        return value;
    }

    // Extra attributes for external links: new tab + safe rel + tooltip
    function buildLinkAttrs(item) {
        if (!isExternal(item)) return '';
        const title = getNavigationTitle(item);
        return ` target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ''}`;
    }

    function buildLogoMarkup(src, brandName, decorative) {
        const alt = decorative ? '' : escapeHtml(brandName) + ' logo';
        const hidden = decorative ? ' aria-hidden="true"' : '';
        return `
                                <img
                                    src="${escapeHtml(src)}"
                                    alt="${alt}"${hidden}
                                    class="jerco-logo"
                                >`;
    }

    function buildLogo(variant) {
        const logo = BRAND.logo || '/assets/images/logo-jerco.png';
        const logoDark = BRAND.logoDark || '/assets/images/logo-jerco-dark-white-text-soft-shadow.svg';
        const brandName = BRAND.shortName || BRAND.legalName || 'Jerco Digital Solusi';
        const frame = variant === 'footer'
            ? 'brand-logo-frame brand-logo-frame--footer'
            : variant === 'menu'
                ? 'brand-logo-frame brand-logo-frame--menu'
                : 'brand-logo-frame';

        if (variant === 'footer') {
            return `
                        <span class="${frame} logo-sweep">
                            ${buildLogoMarkup(logoDark, brandName, false)}
                            ${buildLogoMarkup(logoDark, brandName, true).replace('class="jerco-logo"', 'class="jerco-logo logo-sweep-glint"')}
                        </span>`;
        }

        return `
                            <span class="${frame} logo-sweep block dark:hidden">
                                ${buildLogoMarkup(logo, brandName, false)}
                                ${buildLogoMarkup(logo, brandName, true).replace('class="jerco-logo"', 'class="jerco-logo logo-sweep-glint"')}
                            </span>
                            <span class="${frame} logo-sweep hidden dark:block">
                                ${buildLogoMarkup(logoDark, brandName, false)}
                                ${buildLogoMarkup(logoDark, brandName, true).replace('class="jerco-logo"', 'class="jerco-logo logo-sweep-glint"')}
                            </span>`;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function buildDesktopLink(item) {
        return `
                <a
                    href="${escapeHtml(resolveHref(item.href))}"
                    class="nav-link${isExternal(item) ? ' nav-link-external' : ''}"
                    data-nav-link
                    data-section="${escapeHtml(item.id)}"${buildLinkAttrs(item)}
                >
                    <span data-nav-label>${escapeHtml(getNavigationLabel(item))}</span>${isExternal(item) ? `<i data-lucide="${escapeHtml(item.icon || 'external-link')}" class="jerco-icon jerco-icon-16 nav-link-icon" aria-hidden="true"></i>` : ''}
                </a>
            `;
    }

    // Disclosure dropdown (button + list of links), not an ARIA menu.
    function buildDesktopDropdown(item) {
        const menuId = `nav-submenu-${escapeHtml(item.id)}`;
        const children = getChildren(item).map(function (child) {
            return `
                        <a
                            href="${escapeHtml(resolveHref(child.href))}"
                            class="nav-dropdown-link"
                            data-nav-link
                            data-section="${escapeHtml(child.id)}"${buildLinkAttrs(child)}
                        >
                            ${child.icon ? `<i data-lucide="${escapeHtml(child.icon)}" class="jerco-icon jerco-icon-20" aria-hidden="true"></i>` : ''}
                            <span data-nav-label>${escapeHtml(getNavigationLabel(child))}</span>
                        </a>`;
        }).join('');

        return `
                <div class="nav-dropdown" data-nav-dropdown>
                    <button
                        type="button"
                        class="nav-link nav-dropdown-toggle"
                        data-nav-link
                        data-section="${escapeHtml(item.id)}"
                        aria-expanded="false"
                        aria-controls="${menuId}"
                    >
                        <span data-nav-label>${escapeHtml(getNavigationLabel(item))}</span>
                        <i data-lucide="chevron-down" class="jerco-icon jerco-icon-16 nav-dropdown-caret"  aria-hidden="true"></i>
                    </button>
                    <div id="${menuId}" class="nav-dropdown-menu">${children}
                    </div>
                </div>
            `;
    }

    function buildDesktopNav() {
        return NAVIGATION.map(function (item) {
            return getChildren(item).length ? buildDesktopDropdown(item) : buildDesktopLink(item);
        }).join('');
    }

    function buildMobileLink(item, isChild) {
        return `
                <a
                    href="${escapeHtml(resolveHref(item.href))}"
                    class="mobile-nav-link${isChild ? ' mobile-nav-sublink' : ''}"
                    data-mobile-nav-link
                    data-section="${escapeHtml(item.id)}"${buildLinkAttrs(item)}
                >
                    ${isChild && item.icon ? `<i data-lucide="${escapeHtml(item.icon)}" class="jerco-icon jerco-icon-20" aria-hidden="true"></i>` : ''}
                    <span data-nav-label>${escapeHtml(getNavigationLabel(item))}</span>
                    <i data-lucide="${isExternal(item) ? 'external-link' : 'arrow-right'}" class="jerco-icon jerco-icon-16 nav-trailing-icon" aria-hidden="true"></i>
                </a>
            `;
    }

    // Mobile: parent heading + children always expanded (no hidden taps).
    function buildMobileNav() {
        return NAVIGATION.map(function (item) {
            const children = getChildren(item);
            if (!children.length) return buildMobileLink(item, false);

            return `
                <div class="mobile-nav-group" role="group" aria-labelledby="mobile-group-${escapeHtml(item.id)}">
                    <span
                        id="mobile-group-${escapeHtml(item.id)}"
                        class="mobile-nav-group-label"
                        data-mobile-nav-link-group
                        data-section="${escapeHtml(item.id)}"
                    ><span data-nav-label>${escapeHtml(getNavigationLabel(item))}</span></span>
                    ${children.map(function (child) { return buildMobileLink(child, true); }).join('')}
                </div>
            `;
        }).join('');
    }

    function renderHeader() {
        const header = document.querySelector(SELECTORS.header);
        if (!header) return;

        const brandName = BRAND.shortName || BRAND.legalName || 'Jerco Digital Solusi';

        header.className = 'site-header sticky top-0 z-50 bg-white/85 backdrop-blur-xl transition-all dark:bg-slate-950/85';

        header.innerHTML = `
            <div class="container-custom">
                <div class="site-header-bar flex items-center justify-between gap-4">
                    <a href="${escapeHtml(resolveHref('#hero'))}" class="flex min-w-0 items-center" aria-label="${escapeHtml(brandName)} home">
                        ${buildLogo('header')}
                    </a>

                    <nav class="hidden items-center gap-3 xl:flex" aria-label="Main navigation">
                        ${buildDesktopNav()}
                    </nav>

                    <div class="hidden items-center gap-2 xl:flex">
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
                            <span data-theme-icon class="inline-flex"><i data-lucide="moon" class="jerco-icon jerco-icon-20" aria-hidden="true"></i></span>
                        </button>

                    </div>

                    <button
                        type="button"
                        id="mobile-menu-button"
                        class="icon-button xl:hidden"
                        aria-label="Open menu"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                    >
                        <i data-lucide="menu" class="jerco-icon jerco-icon-24"  aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <div id="mobile-menu" class="fixed inset-0 z-[60] hidden xl:hidden" aria-hidden="true">
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
                        <div class="flex min-w-0 items-center">
                            ${buildLogo('menu')}
                        </div>

                        <button type="button" id="mobile-menu-close" class="icon-button" aria-label="Close menu">
                            <i data-lucide="x" class="jerco-icon jerco-icon-20"  aria-hidden="true"></i>
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
                                <i data-lucide="languages" class="jerco-icon jerco-icon-20"  aria-hidden="true"></i>
                                <span>${state.currentLanguage === 'en' ? 'English' : 'Indonesia'}</span>
                            </button>

                            <button
                                type="button"
                                id="mobile-theme-toggle"
                                class="btn-secondary text-sm"
                                aria-label="Toggle dark mode mobile"
                            >
                                <span data-theme-icon class="inline-flex"><i data-lucide="moon" class="jerco-icon jerco-icon-20" aria-hidden="true"></i></span>
                                <span>Theme</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        `;

        hoistMobileMenu(header);
    }

    // The header uses backdrop-filter, which makes it the containing block for
    // position:fixed descendants. Left inside, the full-screen drawer is clipped
    // to the header height (128px). Move it to <body> so inset-0 = viewport.
    function hoistMobileMenu(header) {
        const menu = header.querySelector(SELECTORS.mobileMenu);
        if (!menu) return;

        document.querySelectorAll(`body > ${SELECTORS.mobileMenu}`).forEach(function (stale) {
            stale.remove();
        });

        document.body.appendChild(menu);
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
                <svg class="brand-whatsapp" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span>WhatsApp</span>
            </a>
        `);
    }

    function renderFooter() {
        const footer = document.querySelector(SELECTORS.footer);
        if (!footer) return;

        const brandName = BRAND.legalName || BRAND.shortName || 'CV Jerco Digital Solusi';
        const email = CONTACT.email || '';
        const phone = CONTACT.phone || '';
        const whatsappUrl = CONTACT.whatsappUrl || '#contact';
        const location = CONTACT.location || '';
        const year = new Date().getFullYear();

        footer.className = 'border-t border-slate-200 bg-slate-950 text-slate-300 dark:border-slate-800';

        footer.innerHTML = `
            <div class="container-custom py-12">
                <div class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
                    <div>
                        <div class="flex items-center">
                            ${buildLogo('footer')}
                        </div>

                        <p class="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                            IT Consulting, Network Infrastructure, Fiber Optic / OSP, CCTV, Cloud, DevOps, Technical Documentation, BOQ/RAB, KMZ/KML Route Analysis, Permit Support, and Project Coordination.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold uppercase tracking-wider text-white">Navigation</h3>
                        <div class="mt-4 grid gap-2 text-sm">
                            ${NAVIGATION.reduce(function (all, item) {
                                // Footer: parent link, then children except ones pointing at the same href.
                                return all.concat([item], getChildren(item).filter(function (child) {
                                    return child.href !== item.href;
                                }));
                            }, []).map(function (item) {
                                return `<a href="${escapeHtml(resolveHref(item.href))}" class="footer-link" data-section="${escapeHtml(item.id)}"${buildLinkAttrs(item)}><span data-nav-label>${escapeHtml(getNavigationLabel(item))}</span></a>`;
                            }).join('')}
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold uppercase tracking-wider text-white">Contact</h3>
                        <div class="mt-4 space-y-3 text-sm">
                            ${email ? `<a href="mailto:${escapeHtml(email)}" class="footer-contact"><i data-lucide="mail" class="jerco-icon jerco-icon-20"  aria-hidden="true"></i><span>${escapeHtml(email)}</span></a>` : ''}
                            ${phone ? `<a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener" class="footer-contact"><svg class="brand-whatsapp" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>${escapeHtml(phone)}</span></a>` : ''}
                            ${location ? `<p class="footer-contact"><i data-lucide="map-pin" class="jerco-icon jerco-icon-20"  aria-hidden="true"></i><span>${escapeHtml(location)}</span></p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
                    <p>© ${year} ${escapeHtml(brandName)}. All rights reserved.</p>
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

    function updateNavigationLabels() {
        getAllNavItems().forEach(function (item) {
            const label = getNavigationLabel(item);
            const title = isExternal(item) ? getNavigationTitle(item) : '';

            document.querySelectorAll(`[data-section="${item.id}"]`).forEach(function (link) {
                const labelEl = link.querySelector('[data-nav-label]');
                if (labelEl) labelEl.textContent = label;
                if (title) link.setAttribute('title', title);
            });
        });
    }

    // Marks the current section (home scroll-spy) or the current sub-page and its parent.
    function setActiveNavLink(sectionId, parentId) {
        if (!sectionId) return;

        const selector = `${SELECTORS.navLink}, ${SELECTORS.mobileNavLink}, [data-mobile-nav-link-group], #site-footer [data-section]`;

        document.querySelectorAll(selector).forEach(function (link) {
            const section = link.getAttribute('data-section');
            const isCurrent = section === sectionId;
            link.classList.toggle('is-active', isCurrent || (!!parentId && section === parentId));

            if (link.tagName === 'A') {
                if (isCurrent && parentId) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            }
        });
    }

    function setDropdownOpen(dropdown, open) {
        if (!dropdown) return;
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        dropdown.classList.toggle('is-open', open);
        toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function bindDropdownEvents() {
        document.querySelectorAll(SELECTORS.dropdown).forEach(function (dropdown) {
            if (dropdown.dataset.dropdownBound === 'true') return;
            dropdown.dataset.dropdownBound = 'true';

            const toggle = dropdown.querySelector('.nav-dropdown-toggle');
            let closeTimer = null;

            // A mouse user who hovered (menu already open) and then clicks should
            // not close it; the first click after a hover-open keeps it open.
            toggle?.addEventListener('click', function () {
                const isOpen = dropdown.classList.contains('is-open');
                const keepOpen = isOpen && dropdown.dataset.hoverOpened === 'true';
                dropdown.dataset.hoverOpened = 'false';
                setDropdownOpen(dropdown, keepOpen ? true : !isOpen);
            });

            // Hover opens only for real pointers (not touch emulation).
            dropdown.addEventListener('pointerenter', function (event) {
                if (event.pointerType !== 'mouse') return;
                window.clearTimeout(closeTimer);
                if (!dropdown.classList.contains('is-open')) {
                    dropdown.dataset.hoverOpened = 'true';
                }
                setDropdownOpen(dropdown, true);
            });

            dropdown.addEventListener('pointerleave', function (event) {
                if (event.pointerType !== 'mouse') return;
                closeTimer = window.setTimeout(function () {
                    dropdown.dataset.hoverOpened = 'false';
                    setDropdownOpen(dropdown, false);
                }, 180);
            });

            dropdown.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && dropdown.classList.contains('is-open')) {
                    setDropdownOpen(dropdown, false);
                    toggle?.focus();
                }
            });

            dropdown.addEventListener('focusout', function (event) {
                if (!dropdown.contains(event.relatedTarget)) {
                    setDropdownOpen(dropdown, false);
                }
            });

            dropdown.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    setDropdownOpen(dropdown, false);
                });
            });
        });

        if (!state.dropdownOutsideBound) {
            state.dropdownOutsideBound = true;
            document.addEventListener('click', function (event) {
                document.querySelectorAll(`${SELECTORS.dropdown}.is-open`).forEach(function (dropdown) {
                    if (!dropdown.contains(event.target)) setDropdownOpen(dropdown, false);
                });
            });
        }
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
        // language.js dispatches on window (not document). Update labels in place:
        // re-rendering the header would drop the click handlers that language.js
        // and theme.js bind directly on the toggle buttons.
        window.addEventListener('jerco:language-changed', function () {
            syncLanguageButtonLabels();
            updateNavigationLabels();
            renderFloatingWhatsapp();
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
        const page = getPageNavContext();

        bindMobileMenuEvents();
        bindDropdownEvents();
        bindSmoothScrollOffset();
        bindThemeProxyEvents();
        bindLanguageProxyEvents();

        if (page.active) {
            setActiveNavLink(page.active, page.parent);
        } else {
            initActiveSectionObserver();
            setActiveNavLink('home');
        }
    }

    function initNavigation() {
        renderHeader();
        renderFooter();
        renderFloatingWhatsapp();
        bindEventsAfterRender();
        bindLanguageEvents();

        if (window.JercoIcons) window.JercoIcons.mount(document);
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
