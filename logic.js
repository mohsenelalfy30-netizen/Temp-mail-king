import { i18n, LANGUAGES } from './src/i18n.ts';
import { DOMAINS } from './domains.js';
import { fetchInbox } from './api-config.js';

// --- DOM Elements ---
const html = document.documentElement;
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const backBtn = document.getElementById('backBtn');
const settingsTitle = document.getElementById('settingsTitle');

const mainMenuView = document.getElementById('mainMenuView');
const langView = document.getElementById('langView');
const privacyView = document.getElementById('privacyView');
const faqView = document.getElementById('faqView');

const btnLangMenu = document.getElementById('btnLangMenu');
const btnPrivacyMenu = document.getElementById('btnPrivacyMenu');
const btnFaqMenu = document.getElementById('btnFaqMenu');

const langSearch = document.getElementById('langSearch');
const langGrid = document.getElementById('langGrid');

const createBtn = document.getElementById('createBtn');
const prefixInput = document.getElementById('emailPrefix');
const prefixWarning = document.getElementById('prefixWarning');
const domainSelect = document.getElementById('emailDomain');
const passwordInput = document.getElementById('emailPassword');

const usageArea = document.getElementById('usageArea');
const readOnlyEmail = document.getElementById('readOnlyEmail');
const readOnlyPassword = document.getElementById('readOnlyPassword');
const copyEmailBtn = document.getElementById('copyEmailBtn');
const copyEmailIcon = document.getElementById('copyEmailIcon');
const copyPasswordBtn = document.getElementById('copyPasswordBtn');
const copyPasswordIcon = document.getElementById('copyPasswordIcon');

const messagesList = document.getElementById('messagesList');
const homeTab = document.getElementById('homeTab');
const libraryTab = document.getElementById('libraryTab');
const navHome = document.getElementById('navHome');
const navLibrary = document.getElementById('navLibrary');
const pushAd = document.getElementById('pushAd');
const closeAdBtn = document.getElementById('closeAdBtn');
const mainContent = document.getElementById('mainContent');

// --- State ---
let isDarkMode = true;
let savedEmails = [];
try {
    const parsed = JSON.parse(localStorage.getItem('tempMailLibrary') || '[]');
    savedEmails = Array.isArray(parsed) ? parsed : [];
} catch (e) {
    savedEmails = [];
}

// --- Global 24h Cleanup ---
function renderLibrary() {
    window.dispatchEvent(new CustomEvent('syncLibrary', { detail: savedEmails }));
}

function cleanupOldAccounts() {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    try {
        if (savedEmails.length > 0) {
            // Get the first email created (which is at the end of the array due to unshift)
            const firstEmail = savedEmails[savedEmails.length - 1];
            
            // Get the timestamp from localStorage or fallback to the first email's createdAt
            let libraryStartTime = localStorage.getItem('libraryStartTime');
            let startTime = libraryStartTime ? parseInt(libraryStartTime, 10) : firstEmail.createdAt;
            
            if (startTime && (Date.now() - startTime >= TWENTY_FOUR_HOURS)) {
                savedEmails = [];
                localStorage.removeItem('tempMailLibrary');
                localStorage.removeItem('libraryStartTime');
                renderLibrary();
            }
        } else {
            localStorage.removeItem('libraryStartTime');
        }
    } catch (e) {
        console.warn("localStorage access denied", e);
    }
}

// --- Initialization ---
async function init() {
    cleanupOldAccounts();
    
    if (window.lucide) window.lucide.createIcons();
    
    // Populate domain select
    if (domainSelect) {
        domainSelect.innerHTML = DOMAINS.map(d => `<option value="${d.pretty}">@${d.pretty}</option>`).join('');
    }
    
    // Load theme
    applyTheme();
    
    // Load language dynamically
    await i18n.loadLanguage(i18n.getCurrentLang());
    
    // Render initial data
    if (savedEmails.length > 0) {
        showEmail(savedEmails[0].email);
    }
    renderLangGrid();

    // Listen for language changes
    i18n.onLanguageChange(() => {
        document.title = i18n.getTranslation('page_title');
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = i18n.getTranslation('page_desc');
        }
        
        if (usageArea && !usageArea.classList.contains('hidden')) {
            showEmail(readOnlyEmail.value, true);
        }
    });
}

function renderLangGrid(filter = '') {
    if (!langGrid) return;
    langGrid.innerHTML = '';
    const filtered = LANGUAGES.filter(l => 
        l.name.toLowerCase().includes(filter.toLowerCase()) || 
        l.native.toLowerCase().includes(filter.toLowerCase()) ||
        l.code.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(lang => {
        const isSelected = lang.code === i18n.getCurrentLang();
        const btn = document.createElement('button');
        btn.className = `flex items-center p-3 rounded-lg border transition-colors ${
            isSelected 
            ? 'border-iosBlue bg-blue-50 dark:bg-[#0a192f]' 
            : 'border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkInput hover:border-iosBlue dark:hover:border-iosBlue hover:bg-gray-100 dark:hover:bg-gray-800'
        }`;
        btn.onclick = async () => {
            await i18n.loadLanguage(lang.code);
            closeModal();
            renderLangGrid(); // Re-render to update selected state
        };

        btn.innerHTML = `
            <span class="fi fi-${lang.flag} fi-circle me-3 text-2xl"></span>
            <div class="flex flex-col items-start">
                <span class="text-sm font-semibold text-black dark:text-white">${lang.native}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${lang.name}</span>
            </div>
            ${isSelected ? `<i data-lucide="check" class="w-5 h-5 text-iosBlue ms-auto"></i>` : ''}
        `;
        langGrid.appendChild(btn);
    });
    if (window.lucide) window.lucide.createIcons();
}

// --- Modal Logic ---
function openModal() {
    if (settingsModal) {
        settingsModal.classList.remove('hidden');
        setTimeout(() => {
            settingsModal.classList.remove('translate-y-full');
        }, 10);
        showMainMenu();
    }
}

function closeModal() {
    if (settingsModal) {
        settingsModal.classList.add('translate-y-full');
        setTimeout(() => {
            settingsModal.classList.add('hidden');
            showMainMenu(true); // Reset for next time
        }, 300);
    }
}

function showMainMenu(immediate = false) {
    if(backBtn) backBtn.classList.add('hidden');
    if(settingsTitle) {
        settingsTitle.setAttribute('data-i18n', 'settings_title');
        settingsTitle.textContent = i18n.getTranslation('settings_title') || 'Language Settings';
    }
    
    let hasVisibleSubView = false;
    [langView, privacyView, faqView].forEach(view => {
        if(view && !view.classList.contains('hidden')) {
            hasVisibleSubView = true;
            view.classList.remove('opacity-100');
            view.classList.add('opacity-0');
            if (immediate) {
                view.classList.add('hidden');
            } else {
                setTimeout(() => view.classList.add('hidden'), 300);
            }
        }
    });

    if(mainMenuView) {
        const delay = (hasVisibleSubView && !immediate) ? 300 : 0;
        setTimeout(() => {
            mainMenuView.classList.remove('hidden');
            setTimeout(() => {
                mainMenuView.classList.remove('opacity-0');
                mainMenuView.classList.add('opacity-100');
            }, 10);
        }, delay);
    }
}

function showSubView(view, titleKey) {
    if(backBtn) backBtn.classList.remove('hidden');
    if(settingsTitle) {
        settingsTitle.setAttribute('data-i18n', titleKey);
        settingsTitle.textContent = i18n.getTranslation(titleKey) || titleKey;
    }

    let hasVisibleMainMenu = false;
    if(mainMenuView && !mainMenuView.classList.contains('hidden')) {
        hasVisibleMainMenu = true;
        mainMenuView.classList.remove('opacity-100');
        mainMenuView.classList.add('opacity-0');
        setTimeout(() => mainMenuView.classList.add('hidden'), 300);
    }

    if(view) {
        const delay = hasVisibleMainMenu ? 300 : 0;
        setTimeout(() => {
            view.classList.remove('hidden');
            setTimeout(() => {
                view.classList.remove('opacity-0');
                view.classList.add('opacity-100');
            }, 10);
        }, delay);
    }
}

if (settingsBtn) settingsBtn.addEventListener('click', openModal);
if (closeSettingsModal) closeSettingsModal.addEventListener('click', closeModal);
if (backBtn) backBtn.addEventListener('click', () => showMainMenu(false));

if (btnLangMenu) btnLangMenu.addEventListener('click', () => showSubView(langView, 'lang_option'));
if (btnPrivacyMenu) btnPrivacyMenu.addEventListener('click', () => showSubView(privacyView, 'privacy_policy_title'));
if (btnFaqMenu) btnFaqMenu.addEventListener('click', () => showSubView(faqView, 'faq_title'));

if (langSearch) langSearch.addEventListener('input', (e) => renderLangGrid(e.target.value));

// --- Theme Logic ---
function applyTheme() {
    const currentThemeIcon = document.getElementById('themeIcon');
    if (isDarkMode) {
        html.classList.add('dark');
        body.classList.add('dark');
        if (currentThemeIcon) currentThemeIcon.setAttribute('data-lucide', 'sun');
    } else {
        html.classList.remove('dark');
        body.classList.remove('dark');
        if (currentThemeIcon) currentThemeIcon.setAttribute('data-lucide', 'moon');
    }
    if (window.lucide) window.lucide.createIcons();
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        applyTheme();
    });
}

// --- Ad Logic ---
if (closeAdBtn) {
    closeAdBtn.addEventListener('click', () => {
        if (pushAd) pushAd.style.display = 'none';
        if (mainContent) mainContent.style.paddingBottom = '60px';
        
        // Update bottom ad sticky position
        const bottomAd = document.querySelector('.sticky.bottom-\\[110px\\]');
        if (bottomAd) {
            bottomAd.classList.remove('bottom-[110px]');
            bottomAd.classList.add('bottom-[60px]');
        }
    });
}

// --- Tab Logic ---
function switchTab(tab) {
    if (tab === 'home') {
        if (homeTab) homeTab.style.display = 'flex';
        if (libraryTab) libraryTab.style.display = 'none';
        if (navHome) {
            navHome.classList.add('text-iosBlue');
            navHome.classList.remove('text-gray-500', 'dark:text-gray-400');
        }
        if (navLibrary) {
            navLibrary.classList.remove('text-iosBlue');
            navLibrary.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    } else {
        if (homeTab) homeTab.style.display = 'none';
        if (libraryTab) libraryTab.style.display = 'flex';
        if (navLibrary) {
            navLibrary.classList.add('text-iosBlue');
            navLibrary.classList.remove('text-gray-500', 'dark:text-gray-400');
        }
        if (navHome) {
            navHome.classList.remove('text-iosBlue');
            navHome.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    }
}

if (navHome) navHome.addEventListener('click', () => switchTab('home'));
if (navLibrary) navLibrary.addEventListener('click', () => switchTab('library'));

// --- Create Email Logic ---
function validateEmail() {
    if (!prefixInput || !domainSelect || !createBtn || !prefixWarning) return;
    
    const prefix = prefixInput.value.trim();
    if (!prefix) {
        prefixWarning.classList.add('hidden');
        createBtn.disabled = false;
        createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        return;
    }

    const prettyDomain = domainSelect.value;
    const domainEntry = DOMAINS.find(d => d.pretty === prettyDomain);
    const realDomain = domainEntry ? domainEntry.real : prettyDomain;
    const realEmail = `${prefix}@${realDomain}`;

    if (savedEmails.some(item => (item.realEmail || item.email) === realEmail)) {
        prefixWarning.classList.remove('hidden');
        createBtn.disabled = true;
        createBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prefixWarning.classList.add('hidden');
        createBtn.disabled = false;
        createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

if (prefixInput) prefixInput.addEventListener('input', validateEmail);
if (domainSelect) domainSelect.addEventListener('change', validateEmail);

if (createBtn) {
    createBtn.addEventListener('click', () => {
        const prefix = prefixInput.value.trim();
        if (!prefix) return;

        const prettyDomain = domainSelect.value;
        const domainEntry = DOMAINS.find(d => d.pretty === prettyDomain);
        const realDomain = domainEntry ? domainEntry.real : prettyDomain;

        const email = `${prefix}@${prettyDomain}`;
        const realEmail = `${prefix}@${realDomain}`;
        
        // Unique Real-Email Check
        if (savedEmails.some(item => (item.realEmail || item.email) === realEmail)) {
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 transition-opacity duration-300';
            toast.textContent = i18n.getTranslation('duplicate_email_error') || 'This email already exists in your library.';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
            return;
        }

        const now = Date.now();
        
        try {
            const lastAdClick = localStorage.getItem('lastAdClick');
            if (!lastAdClick || now - parseInt(lastAdClick) > 300000) {
                window.open('https://example.com/ad', '_blank');
                localStorage.setItem('lastAdClick', now.toString());
            }

            if (savedEmails.length === 0) {
                localStorage.setItem('libraryStartTime', now.toString());
            }

            savedEmails.unshift({ email, realEmail, password: passwordInput ? passwordInput.value : '', createdAt: now });
            localStorage.setItem('tempMailLibrary', JSON.stringify(savedEmails));
        } catch (e) {
            console.warn("localStorage access denied", e);
            savedEmails.unshift({ email, realEmail, password: passwordInput ? passwordInput.value : '', createdAt: now });
        }
        
        // Sync with React
        window.dispatchEvent(new CustomEvent('syncLibrary', { detail: savedEmails }));
        
        if (prefixInput) prefixInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        location.reload();
        showEmail(email);
    });
}

async function showEmail(email, isReRender = false) {
    if (!usageArea || !readOnlyEmail || !readOnlyPassword || !messagesList) return;

    usageArea.classList.remove('hidden');
    usageArea.classList.add('flex');
    
    readOnlyEmail.value = email;
    
    const saved = savedEmails.find(item => item.email === email);
    readOnlyPassword.value = saved ? saved.password : '********';
    
    const realEmail = saved ? (saved.realEmail || email) : email;
    const hintText = document.getElementById('activationHintText');
    if (hintText) {
        const hintTemplate = i18n.getTranslation('activation_hint') || 'Fast Activation Route: [email]';
        hintText.textContent = hintTemplate.replace('[email]', realEmail);
    }
    
    // Store realEmail in dataset for copy logic
    readOnlyEmail.dataset.realEmail = realEmail;
    
    // Use fetchInbox from api-config.js
    let messages = [];
    try {
        messages = await fetchInbox(realEmail);
    } catch (error) {
        console.error('Failed to fetch inbox:', error);
    }
    
    messagesList.innerHTML = (Array.isArray(messages) ? messages : []).map(msg => `
        <div class="border-b border-gray-100 dark:border-darkBorder pb-4">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-base text-black dark:text-white">${msg.sender === 'Admin' ? i18n.getTranslation('admin_name') : msg.sender}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400" dir="ltr">${msg.date}</span>
            </div>
            <p class="text-sm font-medium mb-1 text-black dark:text-white">${msg.subject === 'Welcome to your temporary inbox' ? i18n.getTranslation('welcome_msg') : msg.subject}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${msg.snippet === 'Waiting for new messages...' ? i18n.getTranslation('no_new_msg') : msg.snippet}</p>
        </div>
    `).join('');

    // Ensure icons are rendered in the new HTML
    if (window.lucide) window.lucide.createIcons();
}

window.loadFromLibrary = (email) => {
    showEmail(email);
    switchTab('home');
};

// --- Copy Logic ---
function handleCopy(inputElement, iconElementId) {
    if (!inputElement || !iconElementId) return;
    
    const text = inputElement.dataset.realEmail || inputElement.value;
    if (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                const currentIconElement = document.getElementById(iconElementId);
                if (currentIconElement) {
                    currentIconElement.setAttribute('data-lucide', 'check');
                    currentIconElement.classList.remove('text-gray-500', 'dark:text-gray-400');
                    currentIconElement.classList.add('text-green-500');
                    if (window.lucide) window.lucide.createIcons();
                }
                
                // Show toast
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-24 left-0 right-0 mx-auto w-max bg-gray-800 text-white px-6 py-3 rounded-xl text-sm shadow-2xl z-[9999] flex items-center justify-center transition-all duration-300';
                toast.textContent = iconElementId === 'copyPasswordIcon' 
                    ? (i18n.getTranslation('copy_password_success') || 'تم نسخ كلمة المرور مع مسار التفعيل السريع')
                    : (i18n.getTranslation('copy_email_success') || 'تم نسخ مسار التفعيل بنجاح');
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }, 2000);
                
                setTimeout(() => {
                    const resetIconElement = document.getElementById(iconElementId);
                    if (resetIconElement) {
                        resetIconElement.setAttribute('data-lucide', 'copy');
                        resetIconElement.classList.remove('text-green-500');
                        resetIconElement.classList.add('text-gray-500', 'dark:text-gray-400');
                        if (window.lucide) window.lucide.createIcons();
                    }
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                fallbackCopyTextToClipboard(text, iconElementId);
            });
        } else {
            fallbackCopyTextToClipboard(text, iconElementId);
        }
    }
}

function fallbackCopyTextToClipboard(text, iconElementId) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // Toast
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-24 left-0 right-0 mx-auto w-max bg-gray-800 text-white px-6 py-3 rounded-xl text-sm shadow-2xl z-[9999] flex items-center justify-center transition-all duration-300';
            toast.textContent = iconElementId === 'copyPasswordIcon' 
                ? (i18n.getTranslation('copy_password_success') || 'تم نسخ كلمة المرور مع مسار التفعيل السريع')
                : (i18n.getTranslation('copy_email_success') || 'تم نسخ مسار التفعيل بنجاح');
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
            
            const currentIconElement = document.getElementById(iconElementId);
            if (currentIconElement) {
                currentIconElement.setAttribute('data-lucide', 'check');
                currentIconElement.classList.remove('text-gray-500', 'dark:text-gray-400');
                currentIconElement.classList.add('text-green-500');
                if (window.lucide) window.lucide.createIcons();
                
                setTimeout(() => {
                    const resetIconElement = document.getElementById(iconElementId);
                    if (resetIconElement) {
                        resetIconElement.setAttribute('data-lucide', 'copy');
                        resetIconElement.classList.remove('text-green-500');
                        resetIconElement.classList.add('text-gray-500', 'dark:text-gray-400');
                        if (window.lucide) window.lucide.createIcons();
                    }
                }, 2000);
            }
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

if (copyEmailBtn) copyEmailBtn.addEventListener('click', () => handleCopy(readOnlyEmail, 'copyEmailIcon'));
if (copyPasswordBtn) copyPasswordBtn.addEventListener('click', () => handleCopy(readOnlyPassword, 'copyPasswordIcon'));

const refreshInboxBtn = document.getElementById('refreshInboxBtn');
const refreshIcon = document.getElementById('refreshIcon');

if (refreshInboxBtn) {
    refreshInboxBtn.addEventListener('click', async () => {
        if (!readOnlyEmail || !readOnlyEmail.value) return;
        
        // Add spin animation
        if (refreshIcon) refreshIcon.classList.add('animate-spin');
        
        // Fetch new messages
        await showEmail(readOnlyEmail.value, true);
        
        // Remove spin animation after a short delay to ensure it's visible
        setTimeout(() => {
            if (refreshIcon) refreshIcon.classList.remove('animate-spin');
        }, 500);
    });
}

// Start App
init();
if (window.lucide) window.lucide.createIcons();
