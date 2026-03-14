// I18n Core System

const I18n = {
    currentLanguage: localStorage.getItem('re_language') || 'en',

    // Dictionaries are attached to window globally by the language scripts
    dictionaries: {
        get en() { return window.i18n_en || {}; },
        get te() { return window.i18n_te || {}; },
        get hi() { return window.i18n_hi || {}; }
    },

    dynamicCache: JSON.parse(localStorage.getItem('re_i18n_cache') || '{}'),

    async translateDynamic(text) {
        if (!text || typeof text !== 'string') return text;
        const targetLang = this.currentLanguage;
        if (targetLang === 'en') return text; // No translation needed

        const cacheKey = `${targetLang}|${text}`;
        if (this.dynamicCache[cacheKey]) return this.dynamicCache[cacheKey];

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Translation failed');
            const data = await res.json();

            if (data && data[0]) {
                const translatedString = data[0].map(x => x[0]).join('');
                this.dynamicCache[cacheKey] = translatedString;
                localStorage.setItem('re_i18n_cache', JSON.stringify(this.dynamicCache));
                return translatedString;
            }
        } catch (e) {
            console.warn("Dynamic translation error for text:", text, e);
        }
        return text; // fallback to English
    },

    // Switch the language and store it, then force a full re-render
    setLanguage(langCode) {
        if (!['en', 'te', 'hi'].includes(langCode)) return;
        this.currentLanguage = langCode;
        localStorage.setItem('re_language', langCode);

        // Update active class on switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === langCode);
        });

        // Translate DOM elements marked with data-i18n
        this.translateDOM();

        // Re-render the dynamic page content to apply language changes
        if (typeof window._currentPage === 'function') {
            window._currentPage();
        }
    },

    // Get translated string by key
    t(key, defaultText = "") {
        const dict = this.dictionaries[this.currentLanguage] || this.dictionaries['en'];
        return dict[key] || this.dictionaries['en'][key] || defaultText || key;
    },

    // Scan the document and apply translations to elements with data-i18n
    translateDOM() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // If it's an input/textarea with a placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.hasAttribute('placeholder')) {
                        el.setAttribute('placeholder', translation);
                    }
                } else {
                    // Standard element text (allow HTML via innerHTML if needed, e.g., <em> for heroes)
                    el.innerHTML = translation;
                }
            }
        });
    },

    init() {
        this.translateDOM();
        // Setup initial active state for switches
        const activeBtn = document.querySelector(`.lang-btn[data-lang="${this.currentLanguage}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
};

// Ensure app re-renders on page load if not english to trigger dynamic translations
if (I18n.currentLanguage !== 'en') {
    window._forceI18nRender = true;
}

// Expose translator to global scope
window.t = (key, defaultText) => I18n.t(key, defaultText);

// Initialize after page load
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});
