/*
|--------------------------------------------------------------------------
| JERCO DIGITAL SOLUSI - AI ASSISTANT PLACEHOLDER
|--------------------------------------------------------------------------
| File: js/ai-assistant.js
| Purpose:
| - Render AI assistant UI inside #ai-assistant-root
| - Keep frontend safe without API key exposure
| - Provide placeholder / offline guidance while backend is not ready
| - Optional backend integration via SITE_CONFIG.aiAssistant.endpoint
|
| Dependency:
| - js/config.js must be loaded before this file
|
| Security note:
| - Do not put OpenAI/Gemini/API provider keys in frontend files.
| - Frontend must call your own backend endpoint only.
*/

(function () {
    'use strict';

    const CONFIG = window.SITE_CONFIG || {};
    const AI_CONFIG = CONFIG.aiAssistant || {};
    const CONTACT = CONFIG.contact || {};
    const BRAND = CONFIG.brand || {};
    const LANGUAGE_CONFIG = CONFIG.language || {};

    const ROOT_ID = 'ai-assistant-root';
    const STORAGE_KEY_LANGUAGE = LANGUAGE_CONFIG.storageKey || 'jerco-language';
    const DEFAULT_LANGUAGE = LANGUAGE_CONFIG.defaultLanguage || 'id';
    const MAX_MESSAGE_LENGTH = AI_CONFIG.maxMessageLength || 1000;

    const state = {
        initialized: false,
        enabled: Boolean(AI_CONFIG.enabled),
        endpoint: AI_CONFIG.endpoint || '/api/ai-assistant',
        loading: false,
        messages: []
    };

    const dictionary = {
        id: {
            statusReady: 'Frontend Ready',
            statusOffline: 'Backend belum aktif',
            title: 'Jerco AI Project Assistant',
            subtitle: 'Bantu arahkan kebutuhan IT, FO/OSP, CCTV, BOQ/RAB, dokumentasi teknis, dan koordinasi project.',
            placeholderMode: 'Mode placeholder aktif',
            placeholderNote: 'AI backend belum dihubungkan. Untuk sekarang, form ini bisa dipakai sebagai simulasi UI dan shortcut inquiry ke WhatsApp.',
            backendNote: 'Backend endpoint aktif. Pesan akan dikirim ke server Jerco.',
            inputPlaceholder: 'Tulis kebutuhan project Anda...',
            send: 'Kirim',
            clear: 'Reset',
            whatsapp: 'Lanjut via WhatsApp',
            quickTitle: 'Quick prompt',
            emptyWarning: 'Pesan masih kosong.',
            tooLongWarning: 'Pesan terlalu panjang. Maksimal {max} karakter.',
            errorReply: 'Maaf, AI backend belum bisa dihubungi. Silakan lanjut via WhatsApp agar tim Jerco bisa bantu cek kebutuhan project.',
            offlineReply: 'Siap. Untuk saat ini AI assistant masih placeholder. Kirim detail project via WhatsApp agar bisa dicek manual oleh tim Jerco. Minimal sertakan: lokasi, jenis layanan, existing condition, target pekerjaan, dan file pendukung bila ada.',
            initialReply: 'Halo, saya Jerco AI Project Assistant. Saat ini mode frontend placeholder. Saya bisa bantu susun kebutuhan awal sebelum dikirim ke tim Jerco.',
            copied: 'Draft WA disiapkan.',
            quickPrompts: [
                'Saya butuh survey jaringan kantor / hotel.',
                'Saya butuh BOQ/RAB fiber optic atau network infrastructure.',
                'Saya butuh analisa route KMZ/KML FO/OSP.',
                'Saya butuh support dokumentasi teknis / as-built.',
                'Saya butuh instalasi CCTV dan network.'
            ]
        },
        en: {
            statusReady: 'Frontend Ready',
            statusOffline: 'Backend not active',
            title: 'Jerco AI Project Assistant',
            subtitle: 'Helps organize IT, FO/OSP, CCTV, BOQ/RAB, technical documentation, and project coordination requests.',
            placeholderMode: 'Placeholder mode active',
            placeholderNote: 'AI backend is not connected yet. For now, this form works as a UI simulation and WhatsApp inquiry shortcut.',
            backendNote: 'Backend endpoint is active. Messages will be sent to Jerco server.',
            inputPlaceholder: 'Write your project requirement...',
            send: 'Send',
            clear: 'Reset',
            whatsapp: 'Continue via WhatsApp',
            quickTitle: 'Quick prompt',
            emptyWarning: 'Message is empty.',
            tooLongWarning: 'Message is too long. Maximum {max} characters.',
            errorReply: 'Sorry, the AI backend is not reachable yet. Please continue via WhatsApp so Jerco team can review your project requirement.',
            offlineReply: 'Ready. The AI assistant is currently a placeholder. Send your project details via WhatsApp so Jerco team can review it manually. Minimum details: location, service type, existing condition, work target, and supporting files if available.',
            initialReply: 'Hello, I am Jerco AI Project Assistant. Current mode is frontend placeholder. I can help organize your initial requirement before sending it to Jerco team.',
            copied: 'WhatsApp draft prepared.',
            quickPrompts: [
                'I need an office / hotel network survey.',
                'I need BOQ/RAB for fiber optic or network infrastructure.',
                'I need KMZ/KML route analysis for FO/OSP.',
                'I need technical documentation / as-built support.',
                'I need CCTV and network installation.'
            ]
        }
    };

    function getCurrentLanguage() {
        const saved = safeLocalStorageGet(STORAGE_KEY_LANGUAGE);
        return saved && dictionary[saved] ? saved : DEFAULT_LANGUAGE;
    }

    function t(key, replacements) {
        const lang = getCurrentLanguage();
        const table = dictionary[lang] || dictionary.id;
        let value = table[key] || dictionary.id[key] || key;

        if (Array.isArray(value)) return value;

        if (replacements && typeof value === 'string') {
            Object.keys(replacements).forEach(function (name) {
                value = value.replace(new RegExp('\\{' + name + '\\}', 'g'), replacements[name]);
            });
        }

        return value;
    }

    function safeLocalStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(date) {
        return new Intl.DateTimeFormat(getCurrentLanguage() === 'id' ? 'id-ID' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date || new Date());
    }

    function getRoot() {
        return document.getElementById(ROOT_ID);
    }

    function getWhatsAppUrl(message) {
        const baseUrl = CONTACT.whatsappUrl || 'https://wa.me/6282237650909';
        const separator = baseUrl.includes('?') ? '&' : '?';
        return baseUrl + separator + 'text=' + encodeURIComponent(message || buildWhatsAppDraft());
    }

    function buildWhatsAppDraft(sourceMessage) {
        const brandName = BRAND.shortName || 'Jerco Digital Solusi';
        const message = sourceMessage || getLastUserMessage() || '';

        if (getCurrentLanguage() === 'en') {
            return [
                'Hello ' + brandName + ',',
                '',
                'I want to discuss a project requirement.',
                '',
                'Requirement:',
                message || '- Service needed:',
                '',
                'Location:',
                '- ',
                '',
                'Target / issue:',
                '- '
            ].join('\n');
        }

        return [
            'Halo ' + brandName + ',',
            '',
            'Saya mau diskusi kebutuhan project.',
            '',
            'Kebutuhan:',
            message || '- Layanan yang dibutuhkan:',
            '',
            'Lokasi:',
            '- ',
            '',
            'Target / kendala:',
            '- '
        ].join('\n');
    }

    function getLastUserMessage() {
        const last = state.messages
            .slice()
            .reverse()
            .find(function (item) {
                return item.role === 'user';
            });

        return last ? last.content : '';
    }

    function createMessage(role, content) {
        return {
            id: Date.now() + '-' + Math.random().toString(16).slice(2),
            role: role,
            content: content,
            createdAt: new Date()
        };
    }

    function ensureInitialMessage() {
        if (state.messages.length === 0) {
            state.messages.push(createMessage('assistant', t('initialReply')));
        }
    }

    function render() {
        const root = getRoot();
        if (!root) return;

        ensureInitialMessage();

        root.innerHTML = [
            '<div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">',
                renderHeader(),
                renderNotice(),
                renderQuickPrompts(),
                renderMessages(),
                renderComposer(),
            '</div>'
        ].join('');

        bindEvents(root);
        scrollMessagesToBottom(root);
    }

    function renderHeader() {
        const statusText = state.enabled ? t('statusReady') : t('statusOffline');
        const statusClass = state.enabled
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800'
            : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800';

        return [
            '<div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">',
                '<div class="flex gap-3">',
                    '<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300">',
                        '<i class="ph ph-robot text-2xl"></i>',
                    '</div>',
                    '<div>',
                        '<h3 class="text-lg font-bold text-slate-950 dark:text-white">' + escapeHtml(t('title')) + '</h3>',
                        '<p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">' + escapeHtml(t('subtitle')) + '</p>',
                    '</div>',
                '</div>',
                '<span class="hidden shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 sm:inline-flex ' + statusClass + '">' + escapeHtml(statusText) + '</span>',
            '</div>'
        ].join('');
    }

    function renderNotice() {
        const noticeTitle = state.enabled ? t('statusReady') : t('placeholderMode');
        const noticeText = state.enabled ? t('backendNote') : t('placeholderNote');
        const icon = state.enabled ? 'ph-check-circle' : 'ph-warning-circle';

        return [
            '<div class="p-5 pb-0">',
                '<div class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">',
                    '<i class="ph ' + icon + ' mt-0.5 text-xl text-cyan-500"></i>',
                    '<div>',
                        '<p class="font-bold text-slate-900 dark:text-white">' + escapeHtml(noticeTitle) + '</p>',
                        '<p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">' + escapeHtml(noticeText) + '</p>',
                    '</div>',
                '</div>',
            '</div>'
        ].join('');
    }

    function renderQuickPrompts() {
        const prompts = t('quickPrompts');
        if (!Array.isArray(prompts) || prompts.length === 0) return '';

        return [
            '<div class="px-5 pt-5">',
                '<p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">' + escapeHtml(t('quickTitle')) + '</p>',
                '<div class="flex flex-wrap gap-2">',
                    prompts.map(function (prompt) {
                        return '<button type="button" class="ai-quick-prompt rounded-full border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-cyan-800 dark:hover:bg-cyan-950 dark:hover:text-cyan-300" data-prompt="' + escapeHtml(prompt) + '">' + escapeHtml(prompt) + '</button>';
                    }).join(''),
                '</div>',
            '</div>'
        ].join('');
    }

    function renderMessages() {
        return [
            '<div id="ai-message-list" class="max-h-[360px] space-y-4 overflow-y-auto p-5">',
                state.messages.map(renderMessage).join(''),
                state.loading ? renderLoadingMessage() : '',
            '</div>'
        ].join('');
    }

    function renderMessage(message) {
        const isUser = message.role === 'user';
        const align = isUser ? 'justify-end' : 'justify-start';
        const bubbleClass = isUser
            ? 'bg-cyan-600 text-white rounded-br-md'
            : 'bg-slate-100 text-slate-700 rounded-bl-md dark:bg-slate-900 dark:text-slate-200';
        const label = isUser ? 'You' : (AI_CONFIG.modelLabel || 'Jerco AI Assistant');

        return [
            '<div class="flex ' + align + '">',
                '<div class="max-w-[85%]">',
                    '<div class="mb-1 flex items-center gap-2 text-xs text-slate-400 ' + (isUser ? 'justify-end' : '') + '">',
                        '<span>' + escapeHtml(label) + '</span>',
                        '<span>•</span>',
                        '<span>' + escapeHtml(formatTime(message.createdAt)) + '</span>',
                    '</div>',
                    '<div class="rounded-2xl px-4 py-3 text-sm leading-6 ' + bubbleClass + '">' + escapeHtml(message.content).replace(/\n/g, '<br>') + '</div>',
                '</div>',
            '</div>'
        ].join('');
    }

    function renderLoadingMessage() {
        return [
            '<div class="flex justify-start">',
                '<div class="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">',
                    '<span class="inline-flex items-center gap-2">',
                        '<span class="h-2 w-2 animate-pulse rounded-full bg-cyan-500"></span>',
                        '<span>Processing...</span>',
                    '</span>',
                '</div>',
            '</div>'
        ].join('');
    }

    function renderComposer() {
        return [
            '<form id="ai-assistant-form" class="border-t border-slate-200 p-5 dark:border-slate-800">',
                '<label for="ai-assistant-input" class="sr-only">AI Assistant Message</label>',
                '<div class="flex flex-col gap-3 sm:flex-row">',
                    '<textarea id="ai-assistant-input" rows="3" maxlength="' + MAX_MESSAGE_LENGTH + '" class="min-h-[96px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-950" placeholder="' + escapeHtml(t('inputPlaceholder')) + '"></textarea>',
                    '<div class="flex gap-2 sm:w-36 sm:flex-col">',
                        '<button type="submit" class="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">',
                            '<i class="ph ph-paper-plane-tilt"></i>',
                            '<span>' + escapeHtml(t('send')) + '</span>',
                        '</button>',
                        '<button type="button" id="ai-reset-button" class="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">',
                            '<i class="ph ph-arrow-clockwise"></i>',
                            '<span>' + escapeHtml(t('clear')) + '</span>',
                        '</button>',
                    '</div>',
                '</div>',
                '<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">',
                    '<p class="text-xs text-slate-400"><span id="ai-char-counter">0</span> / ' + MAX_MESSAGE_LENGTH + '</p>',
                    '<a id="ai-whatsapp-link" href="' + escapeHtml(getWhatsAppUrl()) + '" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900">',
                        '<i class="ph ph-whatsapp-logo"></i>',
                        '<span>' + escapeHtml(t('whatsapp')) + '</span>',
                    '</a>',
                '</div>',
            '</form>'
        ].join('');
    }

    function bindEvents(root) {
        const form = root.querySelector('#ai-assistant-form');
        const input = root.querySelector('#ai-assistant-input');
        const counter = root.querySelector('#ai-char-counter');
        const resetButton = root.querySelector('#ai-reset-button');
        const whatsappLink = root.querySelector('#ai-whatsapp-link');
        const quickPromptButtons = root.querySelectorAll('.ai-quick-prompt');

        if (input && counter) {
            input.addEventListener('input', function () {
                counter.textContent = String(input.value.length);
                if (whatsappLink) {
                    whatsappLink.href = getWhatsAppUrl(input.value.trim() || getLastUserMessage());
                }
            });
        }

        if (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                handleSubmit(input);
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', resetConversation);
        }

        quickPromptButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                if (!input) return;
                input.value = button.getAttribute('data-prompt') || '';
                input.focus();
                input.dispatchEvent(new Event('input'));
            });
        });
    }

    async function handleSubmit(input) {
        if (!input || state.loading) return;

        const message = input.value.trim();

        if (!message) {
            pushAssistantMessage(t('emptyWarning'));
            return;
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            pushAssistantMessage(t('tooLongWarning', { max: MAX_MESSAGE_LENGTH }));
            return;
        }

        state.messages.push(createMessage('user', message));
        input.value = '';
        render();

        if (!state.enabled) {
            pushAssistantMessage(t('offlineReply'));
            return;
        }

        await sendToBackend(message);
    }

    async function sendToBackend(message) {
        state.loading = true;
        render();

        try {
            const response = await fetch(state.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    language: getCurrentLanguage(),
                    source: 'jerco-website',
                    context: {
                        brand: BRAND.shortName || 'Jerco Digital Solusi',
                        services: Array.isArray(CONFIG.services) ? CONFIG.services.map(function (service) { return service.id; }) : []
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Backend response error: ' + response.status);
            }

            const data = await response.json();
            const reply = data.reply || data.message || t('errorReply');
            state.messages.push(createMessage('assistant', reply));
        } catch (error) {
            console.warn('[Jerco] AI assistant backend error:', error);
            state.messages.push(createMessage('assistant', t('errorReply')));
        } finally {
            state.loading = false;
            render();
        }
    }

    function pushAssistantMessage(content) {
        window.setTimeout(function () {
            state.messages.push(createMessage('assistant', content));
            render();
        }, 180);
    }

    function resetConversation() {
        state.messages = [];
        render();
    }

    function scrollMessagesToBottom(root) {
        const list = root.querySelector('#ai-message-list');
        if (!list) return;
        list.scrollTop = list.scrollHeight;
    }

    function init() {
        const root = getRoot();
        if (!root) return;

        state.initialized = true;
        render();
    }

    function setEnabled(value) {
        state.enabled = Boolean(value);
        render();
    }

    function sendMessage(message) {
        const input = document.getElementById('ai-assistant-input');
        if (!input) return;
        input.value = message || '';
        input.dispatchEvent(new Event('input'));
        handleSubmit(input);
    }

    document.addEventListener('DOMContentLoaded', init);

    document.addEventListener('jerco:language-changed', function () {
        render();
    });

    window.JercoAIAssistant = {
        init: init,
        render: render,
        reset: resetConversation,
        sendMessage: sendMessage,
        setEnabled: setEnabled,
        getState: function () {
            return {
                initialized: state.initialized,
                enabled: state.enabled,
                endpoint: state.endpoint,
                loading: state.loading,
                messageCount: state.messages.length
            };
        }
    };

    console.info('[Jerco] ai-assistant.js loaded');
})();
