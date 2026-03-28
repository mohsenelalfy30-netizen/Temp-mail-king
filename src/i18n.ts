export interface Language {
    code: string;
    name: string;
    native: string;
    flag: string;
    dir: 'ltr' | 'rtl';
}

export const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', native: 'English', flag: 'us', dir: 'ltr' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: 'sa', dir: 'rtl' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: 'es', dir: 'ltr' },
    { code: 'fr', name: 'French', native: 'Français', flag: 'fr', dir: 'ltr' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: 'de', dir: 'ltr' },
    { code: 'zh', name: 'Chinese', native: '中文', flag: 'cn', dir: 'ltr' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: 'jp', dir: 'ltr' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: 'ru', dir: 'ltr' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: 'pt', dir: 'ltr' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: 'in', dir: 'ltr' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: 'tr', dir: 'ltr' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: 'it', dir: 'ltr' },
    { code: 'fa', name: 'Persian', native: 'فارسی', flag: 'ir', dir: 'rtl' },
    { code: 'he', name: 'Hebrew', native: 'עברית', flag: 'il', dir: 'rtl' },
    { code: 'ko', name: 'Korean', native: '한국어', flag: 'kr', dir: 'ltr' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: 'vn', dir: 'ltr' },
    { code: 'pl', name: 'Polish', native: 'Polski', flag: 'pl', dir: 'ltr' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: 'ua', dir: 'ltr' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: 'nl', dir: 'ltr' },
    { code: 'th', name: 'Thai', native: 'ไทย', flag: 'th', dir: 'ltr' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: 'id', dir: 'ltr' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', flag: 'my', dir: 'ltr' },
    { code: 'tl', name: 'Tagalog', native: 'Tagalog', flag: 'ph', dir: 'ltr' },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: 'ke', dir: 'ltr' },
    { code: 'ur', name: 'Urdu', native: 'اردو', flag: 'pk', dir: 'rtl' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: 'in', dir: 'ltr' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: 'in', dir: 'ltr' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: 'in', dir: 'ltr' },
    { code: 'mr', name: 'Marathi', native: 'मराठी', flag: 'in', dir: 'ltr' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: 'in', dir: 'ltr' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: 'in', dir: 'ltr' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: 'in', dir: 'ltr' },
    { code: 'my', name: 'Burmese', native: 'မြန်မာ', flag: 'mm', dir: 'ltr' },
    { code: 'am', name: 'Amharic', native: 'አማርኛ', flag: 'et', dir: 'ltr' },
    { code: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: 'ng', dir: 'ltr' },
    { code: 'ig', name: 'Igbo', native: 'Igbo', flag: 'ng', dir: 'ltr' },
    { code: 'ha', name: 'Hausa', native: 'Hausa', flag: 'ng', dir: 'ltr' },
    { code: 'zu', name: 'Zulu', native: 'isiZulu', flag: 'za', dir: 'ltr' },
    { code: 'xh', name: 'Xhosa', native: 'isiXhosa', flag: 'za', dir: 'ltr' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: 'bd', dir: 'ltr' }
];

export class I18nManager {
    private currentLang: string = 'en';
    private translations: Record<string, string> = {};
    private onLanguageChangeCallbacks: ((lang: string) => void)[] = [];

    constructor() {
        this.detectAndLoadLanguage();
    }

    private detectAndLoadLanguage() {
        let savedLang = null;
        try {
            savedLang = localStorage.getItem('user-lang');
        } catch (e) {
            console.warn("localStorage access denied", e);
        }
        if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
            this.currentLang = savedLang;
        } else {
            const browserLangs = navigator.languages ? navigator.languages.map(l => l.split('-')[0]) : (navigator.language ? [navigator.language.split('-')[0]] : ['en']);
            let found = false;
            for (const lang of browserLangs) {
                if (LANGUAGES.some(l => l.code === lang)) {
                    this.currentLang = lang;
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.currentLang = 'en';
            }
        }
        this.loadLanguage(this.currentLang);
    }

    public async loadLanguage(langCode: string) {
        const langObj = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
        this.currentLang = langObj.code;
        
        let enTranslations = {};
        try {
            const responseEn = await fetch(`/src/locales/translation(en).json`);
            enTranslations = await responseEn.json();
        } catch (error) {
            console.warn('Failed to load English fallback translations', error);
        }

        let targetTranslations = {};
        if (this.currentLang !== 'en') {
            try {
                const responseTarget = await fetch(`/src/locales/translation(${this.currentLang}).json`);
                targetTranslations = await responseTarget.json();
            } catch (error) {
                console.warn(`Failed to load translations for ${this.currentLang}, falling back to English`, error);
            }
        }

        // Merge translations, falling back to English for missing keys
        this.translations = { ...enTranslations, ...targetTranslations };

        this.applyToDOM(langObj);
        try {
            localStorage.setItem('user-lang', this.currentLang);
        } catch (e) {
            console.warn("localStorage access denied", e);
        }
        
        // Notify listeners
        this.onLanguageChangeCallbacks.forEach(cb => cb(this.currentLang));
    }

    private applyToDOM(langObj: Language) {
        const html = document.documentElement;
        html.lang = langObj.code;
        html.dir = langObj.dir;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && this.translations[key]) {
                el.textContent = this.translations[key];
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key && this.translations[key]) {
                el.innerHTML = this.translations[key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && this.translations[key]) {
                (el as HTMLInputElement).placeholder = this.translations[key];
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key && this.translations[key]) {
                el.setAttribute('title', this.translations[key]);
            }
        });
    }

    public getTranslation(key: string): string {
        return this.translations[key] || key;
    }

    public getCurrentLang(): string {
        return this.currentLang;
    }

    public onLanguageChange(callback: (lang: string) => void) {
        this.onLanguageChangeCallbacks.push(callback);
    }
}

export const i18n = new I18nManager();
