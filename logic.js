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
const libraryList = document.getElementById('libraryList'); // تم ربط قائمة المكتبة
const navHome = document.getElementById('navHome');
const navLibrary = document.getElementById('navLibrary');
const pushAd = document.getElementById('pushAd');
const closeAdBtn = document.getElementById('closeAdBtn');
const mainContent = document.getElementById('mainContent');

// --- State ---
let isDarkMode = true;
let savedEmails = [];
let activePollTimeout = null; 
let currentActiveEmail = null;
let currentActiveRealEmail = null;

try {
    const parsed = JSON.parse(localStorage.getItem('tempMailLibrary') || '[]');
    savedEmails = Array.isArray(parsed) ? parsed : [];
} catch (e) {
    savedEmails = [];
}

// --- Global 20 Minutes Cleanup & UI Rendering ---
function renderLibrary() {
    const data = JSON.parse(localStorage.getItem('tempMailLibrary') || '[]');
    
    // بناء واجهة المكتبة المطورة
    if (libraryList) {
        if (data.length === 0) {
            const emptyText = i18n.getTranslation('library_empty') || 'المكتبة فارغة';
            libraryList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                    <i data-lucide="folder-open" class="w-16 h-16 mb-4 opacity-20"></i>
                    <p class="text-sm font-medium">${emptyText}</p>
                </div>`;
        } else {
            libraryList.innerHTML = data.map(item => {
                // تنسيق الوقت
                const dateObj = new Date(item.createdAt);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = dateObj.toLocaleDateString();

                return `
                <div class="flex items-center justify-between p-3 bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder rounded-xl shadow-sm hover:border-iosBlue transition-colors group mb-3">
                    <div class="flex items-center gap-2">
                        <button onclick="window.confirmDelete('${item.email}')" class="p-2 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-800/40 rounded-lg transition-colors shrink-0" title="حذف">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                        <button onclick="window.loadFromLibrary('${item.email}')" class="p-2 text-iosBlue bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/40 rounded-lg transition-colors shrink-0" title="تفعيل">
                            <i data-lucide="chevron-right" class="w-5 h-5 rtl:rotate-180"></i>
                        </button>
                    </div>
                    <div class="flex-1 text-right truncate cursor-pointer mx-3" onclick="window.loadFromLibrary('${item.email}')">
                        <div class="font-bold text-sm text-black dark:text-white truncate">${item.email}</div>
                        <div class="text-[10px] text-gray-400 mt-1">${timeStr} ${dateStr}</div>
                    </div>
                </div>
            `}).join('');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    window.dispatchEvent(new CustomEvent('syncLibrary', { detail: data }));
}

function resetUIForEmptyState() {
    if (usageArea) {
        usageArea.classList.add('hidden');
        usageArea.classList.remove('flex');
    }
    if (readOnlyEmail) readOnlyEmail.value = '';
    if (readOnlyPassword) readOnlyPassword.value = '';
    if (readOnlyEmail) readOnlyEmail.dataset.realEmail = '';
    
    currentActiveEmail = null;
    currentActiveRealEmail = null;
    if (activePollTimeout) {
        clearTimeout(activePollTimeout);
        activePollTimeout = null;
    }
    
    const container = document.getElementById('inboxContainer') || messagesList;
    if (container) {
        const noMessagesText = i18n.getTranslation('no_messages') || 'لا توجد رسائل';
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <i data-lucide="mail-open" class="w-16 h-16 mb-4 opacity-20"></i>
                <p>${noMessagesText}</p>
            </div>`;
        delete container.dataset.renderedHash;
        if (window.lucide) window.lucide.createIcons();
    }
}

function cleanupOldAccounts() {
    const TWENTY_MINUTES = 20 * 60 * 1000;
    try {
        if (savedEmails.length > 0) {
            const now = Date.now();
            const initialLength = savedEmails.length;
            
            savedEmails = savedEmails.filter(emailObj => {
                return (now - emailObj.createdAt) < TWENTY_MINUTES;
            });
            
            if (savedEmails.length !== initialLength) {
                localStorage.setItem('tempMailLibrary', JSON.stringify(savedEmails));
                renderLibrary();
                
                if (savedEmails.length === 0) {
                    resetUIForEmptyState();
                } else {
                    const isCurrentStillAlive = savedEmails.some(e => e.email === currentActiveEmail);
                    if (!isCurrentStillAlive && savedEmails.length > 0) {
                        showEmail(savedEmails[0].email);
                    }
                }
            }
        } else {
            localStorage.removeItem('libraryStartTime');
            resetUIForEmptyState();
        }
    } catch (e) {
        console.warn("localStorage access denied", e);
    }
}

// ==========================================
// NEW: Global Delete Function with Confirmation
// ==========================================
window.confirmDelete = function(targetEmail) {
    const confirmMsg = i18n.getTranslation('delete_confirm') || 'هل أنت متأكد من حذف هذا الإيميل وجميع رسائله المرتبطة؟';
    if (confirm(confirmMsg)) {
        window.deleteEmailRecord(targetEmail);
    }
};

window.deleteEmailRecord = function(targetEmail) {
    // 1. Remove from local array (This also inherently deletes its saved messages)
    savedEmails = savedEmails.filter(item => item.email !== targetEmail && item.realEmail !== targetEmail);
    
    // 2. Update Local Storage immediately
    localStorage.setItem('tempMailLibrary', JSON.stringify(savedEmails));
    
    // 3. Notify library UI to update
    renderLibrary();
    
    // 4. Reset main UI if the deleted email was currently active
    if (currentActiveEmail === targetEmail || currentActiveRealEmail === targetEmail) {
        resetUIForEmptyState();
        if (savedEmails.length > 0) {
            showEmail(savedEmails[0].email);
        }
    }
    
    // 5. Instantly re-validate the input so the Create button unlocks
    validateEmail();
};

// --- Initialization ---
async function init() {
    cleanupOldAccounts();
    setInterval(cleanupOldAccounts, 60000); 
    
    if (window.lucide) window.lucide.createIcons();
    
    if (domainSelect) {
        domainSelect.innerHTML = DOMAINS.map(d => `<option value="${d.pretty}">@${d.pretty}</option>`).join('');
    }
    
    applyTheme();
    await i18n.loadLanguage(i18n.getCurrentLang());
    
    if (savedEmails.length > 0) {
        showEmail(savedEmails[0].email);
    } else {
        resetUIForEmptyState();
    }
    renderLangGrid();
    renderLibrary(); // تأكيد بناء المكتبة عند البداية

    i18n.onLanguageChange(() => {
        document.title = i18n.getTranslation('page_title');
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = i18n.getTranslation('page_desc');
        }
        
        const container = document.getElementById('inboxContainer') || messagesList;
        if (container) delete container.dataset.renderedHash;
        
        if (usageArea && !usageArea.classList.contains('hidden') && savedEmails.length > 0) {
            showEmail(readOnlyEmail.value, true);
        } else {
            resetUIForEmptyState();
        }
        renderLibrary(); // تحديث لغة المكتبة
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
            renderLangGrid();
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

// --- Modal & Navigation Logic ---
function openModal() {
    if (settingsModal) {
        settingsModal.classList.remove('hidden');
        setTimeout(() => settingsModal.classList.remove('translate-y-full'), 10);
        showMainMenu();
    }
}

function closeModal() {
    if (settingsModal) {
        settingsModal.classList.add('translate-y-full');
        setTimeout(() => {
            settingsModal.classList.add('hidden');
            showMainMenu(true);
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
            if (immediate) view.classList.add('hidden');
            else setTimeout(() => view.classList.add('hidden'), 300);
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

// --- Ad & Tab Logic ---
if (closeAdBtn) {
    closeAdBtn.addEventListener('click', () => {
        if (pushAd) pushAd.style.display = 'none';
        if (mainContent) mainContent.style.paddingBottom = '60px';
        const bottomAd = document.querySelector('.sticky.bottom-\\[110px\\]');
        if (bottomAd) {
            bottomAd.classList.remove('bottom-[110px]');
            bottomAd.classList.add('bottom-[60px]');
        }
    });
}

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
    createBtn.addEventListener('click', async () => {
        const prefix = prefixInput.value.trim();
        if (!prefix) return;

        const now = Date.now();
        
        try {
            const lastAdClick = localStorage.getItem('lastAdClick');
            if (!lastAdClick || now - parseInt(lastAdClick) > 300000) {
                window.open('https://example.com/ad', '_blank', 'noopener,noreferrer');
                localStorage.setItem('lastAdClick', now.toString());
            }
        } catch (e) {
            console.warn("localStorage access denied for Ads", e);
        }

        const prettyDomain = domainSelect.value;
        const domainEntry = DOMAINS.find(d => d.pretty === prettyDomain);
        const realDomain = domainEntry ? domainEntry.real : prettyDomain;

        const email = `${prefix}@${prettyDomain}`;
        const realEmail = `${prefix}@${realDomain}`;
        
        if (savedEmails.some(item => (item.realEmail || item.email) === realEmail)) {
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 transition-opacity duration-300';
            toast.textContent = i18n.getTranslation('duplicate_email_error') || 'هذا الإيميل موجود بالفعل في مكتبتك.';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
            return;
        }

        try {
            createBtn.disabled = true;
            createBtn.style.opacity = '0.5';
            
            const response = await fetch(`https://api.king-tmail.tech/api/check?email=${encodeURIComponent(realEmail)}`);
            const data = await response.json();
            
            if (data.exists) {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 transition-opacity duration-300';
                toast.textContent = i18n.getTranslation('email_taken_error') || 'عذراً، هذا الاسم مستخدم حالياً من شخص آخر، جرب اسماً آخر.';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }, 4000);
                
                createBtn.disabled = false;
                createBtn.style.opacity = '1';
                return; 
            }
            createBtn.disabled = false;
            createBtn.style.opacity = '1';
        } catch (err) {
            console.error("Error checking KV availability:", err);
            createBtn.disabled = false;
            createBtn.style.opacity = '1';
        }

        const newEmailObj = { 
            email, 
            realEmail, 
            password: passwordInput ? passwordInput.value : '', 
            createdAt: now,
            messages: [] 
        };

        try {
            if (savedEmails.length === 0) {
                localStorage.setItem('libraryStartTime', now.toString());
            }
            savedEmails.unshift(newEmailObj);
            localStorage.setItem('tempMailLibrary', JSON.stringify(savedEmails));
        } catch (e) {
            savedEmails.unshift(newEmailObj);
        }
        
        renderLibrary();
        
        if (prefixInput) prefixInput.value = '';
        if (passwordInput) passwordInput.value = '';
       
        showEmail(email);

        const expireToast = document.createElement('div');
        expireToast.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-3 rounded-xl text-sm font-bold shadow-2xl z-[9999] transition-all duration-500 flex items-center space-x-3 rtl:space-x-reverse transform -translate-y-20 opacity-0';
        const warningText = i18n.getTranslation('expiry_warning') || 'تنبيه: هذا الإيميل متاح لمدة 20 دقيقة فقط وسيتم تدميره تلقائياً!';
        expireToast.innerHTML = `
            <svg class="w-6 h-6 text-yellow-600 animate-pulse shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span data-i18n="expiry_warning">${warningText}</span>
        `;
        document.body.appendChild(expireToast);
        
        setTimeout(() => { expireToast.classList.remove('-translate-y-20', 'opacity-0'); }, 50);
        setTimeout(() => {
            expireToast.classList.add('-translate-y-20', 'opacity-0');
            setTimeout(() => expireToast.remove(), 500);
        }, 7000); 
    });
}

// ==========================================
// Visibility API (توفير الطلبات عند تصغير الموقع)
// ==========================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (activePollTimeout) {
            clearTimeout(activePollTimeout);
            activePollTimeout = null;
        }
    } else {
        if (currentActiveEmail && currentActiveRealEmail) {
            const saved = savedEmails.find(e => e.email === currentActiveEmail);
            if (saved && (!saved.messages || saved.messages.length < 2)) {
                // استئناف الفحص فور العودة للموقع
                fetchAndRenderMessages(currentActiveRealEmail, currentActiveEmail).then(() => {
                    scheduleNextPoll(currentActiveRealEmail, currentActiveEmail);
                });
            }
        }
    }
});

// ==========================================
// Advanced Decoding Engine (معالجة الرسائل المعقدة)
// ==========================================
function advancedDecode(text) {
    if (!text) return "";
    let decodedText = text;

    // استخراج محتوى الـ HTML إذا كان البريد من نوع Multipart
    if (decodedText.includes('Content-Type: multipart/')) {
        const boundaryMatch = decodedText.match(/boundary="?([^"\r\n]+)"?/);
        if (boundaryMatch) {
            const boundary = boundaryMatch[1];
            const parts = decodedText.split('--' + boundary);
            
            let htmlPart = parts.find(p => p.includes('Content-Type: text/html'));
            let plainPart = parts.find(p => p.includes('Content-Type: text/plain'));
            
            let targetPart = htmlPart || plainPart;
            if (targetPart) {
                // إزالة رأس الجزء (Headers) للحصول على النص الخام
                decodedText = targetPart.replace(/[\s\S]*?\r?\n\r?\n/, '').trim();
                
                // فك التشفير الخاص بهذا الجزء فقط
                if (targetPart.includes('Content-Transfer-Encoding: base64')) {
                    try {
                        let cleanB64 = decodedText.replace(/\s+/g, '');
                        decodedText = decodeURIComponent(escape(atob(cleanB64)));
                    } catch (e) {
                        try { decodedText = atob(decodedText.replace(/\s+/g, '')); } catch(err){}
                    }
                } else if (targetPart.includes('Content-Transfer-Encoding: quoted-printable')) {
                    decodedText = decodedText.replace(/=\r?\n/g, '').replace(/=([A-F0-9]{2})/gi, function(match, p1) {
                        return String.fromCharCode(parseInt(p1, 16));
                    });
                    try { decodedText = decodeURIComponent(escape(decodedText)); } catch(e){}
                }
                return decodedText;
            }
        }
    }

    // بدائل فك التشفير للطرق العادية (Quoted-Printable)
    if (decodedText.includes('=3D') || decodedText.includes('=\r\n') || decodedText.includes('=\n')) {
        decodedText = decodedText.replace(/=\r?\n/g, ''); 
        decodedText = decodedText.replace(/=3D/gi, '=');  
        
        decodedText = decodedText.replace(/(?:=[0-9A-F]{2})+/gi, function(match) {
            try { return decodeURIComponent(match.replace(/=/g, '%')); } 
            catch(e) { return match; }
        });
    }

    // بدائل فك التشفير لـ Base64 الصريح
    if (decodedText.includes('base64')) {
        const parts = decodedText.split(/\r?\n\r?\n/);
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (!part.includes(':') && part.length > 50 && /^[A-Za-z0-9+/=\s]+$/.test(part.trim())) {
                try {
                    let cleanBase64 = part.replace(/\s+/g, '');
                    let b64Decoded = atob(cleanBase64);
                    try { b64Decoded = decodeURIComponent(escape(b64Decoded)); } catch(e){}
                    decodedText = b64Decoded;
                    break; 
                } catch (e) {
                    console.error("Base64 decode failed for block", e);
                }
            }
        }
    }

    return decodedText;
}

// --- Smart Show Email ---
async function showEmail(email, isReRender = false) {
    if (!usageArea || !readOnlyEmail || !readOnlyPassword) return;

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
    
    readOnlyEmail.dataset.realEmail = realEmail;
    currentActiveEmail = email;
    currentActiveRealEmail = realEmail;

    if (activePollTimeout) {
        clearTimeout(activePollTimeout);
        activePollTimeout = null;
    }

    // تحميل الرسائل فوراً من الـ localStorage إذا كانت مخزنة
    if (saved && saved.messages && saved.messages.length > 0) {
        renderMessagesHTML(saved.messages);
    } else {
        const container = document.getElementById('inboxContainer') || messagesList;
        if (container) delete container.dataset.renderedHash; 
    }

    fetchAndRenderMessages(realEmail, email).then(() => {
        if (!isReRender) {
            scheduleNextPoll(realEmail, email);
        }
    });
}

// ==========================================
// Smart Polling (نظام الفحص الذكي وتوفير الطلبات)
// ==========================================
function scheduleNextPoll(realEmail, emailKey) {
    if (activePollTimeout) clearTimeout(activePollTimeout);
    
    // إيقاف الفحص إذا غيّر المستخدم الإيميل أو خرج من الصفحة
    if (currentActiveEmail !== emailKey || document.hidden) return;

    const saved = savedEmails.find(e => e.email === emailKey);
    // الإيقاف التام لتوفير الموارد في حال وصول رسالتين (الحد الأقصى)
    if (!saved || (saved.messages && saved.messages.length >= 2)) return;

    const elapsed = Date.now() - saved.createdAt;
    const TWENTY_MINS = 20 * 60 * 1000;
    
    if (elapsed >= TWENTY_MINS) return;

    // توقيتات ذكية بناءً على زمن الإنشاء
    let delay = (elapsed < 60000) ? 15000 : (elapsed < 10 * 60 * 1000) ? 120000 : 300000;

    activePollTimeout = setTimeout(async () => {
        await fetchAndRenderMessages(realEmail, emailKey);
        scheduleNextPoll(realEmail, emailKey);
    }, delay);
}

// حفظ الرسائل الجديدة داخل الكائن الخاص بالإيميل في الـ localStorage
async function fetchAndRenderMessages(realEmail, emailKey) {
    try {
        const data = await fetchInbox(realEmail);
        const messages = Array.isArray(data) ? data : (data.messages || []);
        
        if (emailKey) {
            const savedIndex = savedEmails.findIndex(e => e.email === emailKey);
            if (savedIndex !== -1) {
                savedEmails[savedIndex].messages = messages;
                localStorage.setItem('tempMailLibrary', JSON.stringify(savedEmails));
            }
        }
        
        renderMessagesHTML(messages);
    } catch (err) {
        console.error('Background Sync Error:', err);
    }
}

// --- Render Messages UI ---
function renderMessagesHTML(messages) {
    const container = document.getElementById('inboxContainer') || messagesList;
    if (!container) return;

    const currentDataHash = messages.map(m => m.timestamp).join('-');
    if (container.dataset.renderedHash === currentDataHash) return; 
    container.dataset.renderedHash = currentDataHash;

    let htmlContent = '';

    if (messages.length >= 2) {
        const inboxFullTitle = i18n.getTranslation('inbox_full_title') || 'اكتمل الصندوق';
        const inboxFullDesc = i18n.getTranslation('inbox_full_desc') || 'وصل الحد الأقصى (رسالتين). لن يتم استقبال المزيد لهذا العنوان.';
        htmlContent += `
            <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center shadow-sm">
                <span class="text-2xl mb-2 block animate-bounce">⚠️</span>
                <h3 class="text-red-800 dark:text-red-400 font-bold text-sm mb-1">${inboxFullTitle}</h3>
                <p class="text-xs text-red-600 dark:text-red-300">${inboxFullDesc}</p>
            </div>
        `;
    }

    if (messages.length === 0) {
        const noMessagesText = i18n.getTranslation('no_messages') || 'لا توجد رسائل';
        htmlContent += `
            <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <i data-lucide="mail-open" class="w-16 h-16 mb-4 opacity-20"></i>
                <p>${noMessagesText}</p>
            </div>`;
    } else {
        messages.sort((a, b) => b.timestamp - a.timestamp);

        htmlContent += messages.map((msg) => {
            let rawBody = msg.body || msg.content || msg.raw || "";
            let processedBody = advancedDecode(rawBody).trim();
            
            const safeHTML = (window.DOMPurify) ? DOMPurify.sanitize(processedBody, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'img', 'div', 'span', 'table', 'tr', 'td', 'tbody', 'thead', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'center', 'hr'],
                ALLOWED_ATTR: ['href', 'src', 'style', 'target', 'alt', 'width', 'height', 'class', 'id', 'cellpadding', 'cellspacing', 'border', 'align', 'valign', 'bgcolor', 'color']
            }) : processedBody;

            let otpMatch = msg.subject ? msg.subject.match(/\b\d{4,8}\b/) : null;
            if (!otpMatch) otpMatch = processedBody.match(/\b\d{4,8}\b/);

            const otpBox = otpMatch ? `
                <div class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    <span class="text-xs text-blue-500 block mb-1">${i18n.getTranslation('verification_code') || 'رمز التحقق'}</span>
                    <span class="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-widest">${otpMatch[0]}</span>
                </div>` : '';

            const senderName = msg.from || i18n.getTranslation('unknown_sender') || 'غير معروف';
            const subjectText = msg.subject || i18n.getTranslation('no_subject') || 'بدون عنوان';

            return `
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-3 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="w-full p-4 flex items-center justify-between text-right">
                    <div class="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                            ${msg.from ? msg.from.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="truncate">
                            <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${senderName}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${subjectText}</p>
                        </div>
                    </div>
                    <span class="text-[10px] text-gray-400 shrink-0 mr-2">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </button>
                <div class="hidden p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                    ${otpBox}
                    <div class="message-content text-sm text-gray-900 dark:text-gray-200 overflow-x-auto leading-relaxed" style="word-break: break-word;">
                        ${safeHTML.includes('<table') || safeHTML.includes('<div') ? safeHTML : `<pre class="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-300">${safeHTML}</pre>`}
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
    container.innerHTML = htmlContent;
    if (window.lucide) window.lucide.createIcons();
}

// دالة التفعيل من المكتبة
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
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
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
        
        if (refreshIcon) refreshIcon.classList.add('animate-spin');
        
        await fetchAndRenderMessages(currentActiveRealEmail, currentActiveEmail);
        
        setTimeout(() => {
            if (refreshIcon) refreshIcon.classList.remove('animate-spin');
        }, 500);
    });
}

// Start App
init();
if (window.lucide) window.lucide.createIcons();

