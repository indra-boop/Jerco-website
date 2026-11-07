/*
 * Jerco Digital Solusi — icon mount
 * File: js/icons.js
 *
 * Pictograms: Lucide Outline 1.70.0 (https://unpkg.com/lucide@1.70.0/dist/umd/lucide.min.js).
 * License: ISC, with Feather portions under MIT. See js/vendor/LUCIDE-LICENSE.txt.
 * Names follow the Jerco icon inventory v0.1 candidate (not an approved brand standard).
 * Glyphs stay outline, stroke 2, currentColor. Sizes are 16/20/24/32/48.
 * WhatsApp uses the Simple Icons mark (CC0), not a Lucide pictogram.
 */
(function () {
    'use strict';

    function mount(root) {
        if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
        window.lucide.createIcons({
            root: root || document,
            attrs: {
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round'
            }
        });
    }

    function boot() {
        mount(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.JercoIcons = { mount: mount };
})();
