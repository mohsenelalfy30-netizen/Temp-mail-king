import React, { useState, useEffect } from 'react';
import { i18n } from './i18n.ts';
import { Inbox, ExternalLink, Trash2, ChevronRight } from 'lucide-react';

interface SavedEmail {
    email: string;
    realEmail?: string;
    password?: string;
    createdAt: number;
}

export default function App() {
    const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([]);
    const [langTick, setLangTick] = useState(0);

    useEffect(() => {
        // 1. Load initial data from LocalStorage
        let stored = null;
        try {
            stored = localStorage.getItem('tempMailLibrary');
        } catch (e) {
            console.warn("localStorage access denied", e);
        }
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSavedEmails(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                console.error("Failed to parse library", e);
            }
        }

        // 2. Listen for sync events from logic.js
        const handleSync = (e: Event) => {
            const customEvent = e as CustomEvent;
            setSavedEmails(Array.isArray(customEvent.detail) ? customEvent.detail : []);
        };

        window.addEventListener('syncLibrary', handleSync);

        // 3. Listen for language changes to re-render translations
        const handleLangChange = () => setLangTick(t => t + 1);
        if (i18n && typeof i18n.onLanguageChange === 'function') {
            i18n.onLanguageChange(handleLangChange);
        }

        return () => {
            window.removeEventListener('syncLibrary', handleSync);
        };
    }, []);

    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const handleDeleteClick = (email: string) => {
        setConfirmDelete(email);
    };

    const confirmDeleteAction = () => {
        if (!confirmDelete) return;
        const updatedList = savedEmails.filter(item => item.email !== confirmDelete);
        
        // Update State
        setSavedEmails(updatedList);
        
        // Update LocalStorage
        try {
            localStorage.setItem('tempMailLibrary', JSON.stringify(updatedList));
            if (updatedList.length === 0) {
                localStorage.removeItem('libraryStartTime');
            }
        } catch (e) {
            console.warn("localStorage access denied", e);
        }

        // Dispatch event to sync the rest of the app (Fixes the delete button issue)
        window.dispatchEvent(new CustomEvent('syncLibrary', { detail: updatedList }));
        setConfirmDelete(null);
    };

    const cancelDelete = () => {
        setConfirmDelete(null);
    };

    const handleActivate = (email: string) => {
        if (typeof (window as any).loadFromLibrary === 'function') {
            (window as any).loadFromLibrary(email);
        }
    };

    if (savedEmails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                <Inbox className="w-12 h-12 mb-3 opacity-50" />
                <p>{i18n.getTranslation('library_empty') || 'Your library is empty.'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 w-full">
            {savedEmails.map((item, index) => (
                <div 
                    key={index} 
                    className="bg-gray-50 dark:bg-darkInput border border-gray-200 dark:border-darkBorder rounded-xl py-4 px-4 flex items-center justify-between transition-all hover:shadow-md"
                >
                    <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-semibold text-black dark:text-white truncate" dir="ltr">
                            {item.email}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(item.createdAt).toLocaleString()}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => handleActivate(item.email)}
                            className="bg-iosBlue/10 hover:bg-iosBlue/20 text-iosBlue rounded-lg transition-colors flex items-center justify-center w-10 h-10 shrink-0"
                            title={i18n.getTranslation('btn_activate') || 'Activate'}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={() => handleDeleteClick(item.email)}
                            className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 rounded-lg transition-colors flex items-center justify-center w-10 h-10 shrink-0"
                            title={i18n.getTranslation('btn_delete') || 'Delete'}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}

            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-darkCard rounded-xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-bold text-black dark:text-white mb-2">{i18n.getTranslation('trash_title') || 'Delete'}</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{i18n.getTranslation('delete_confirm') || 'Are you sure you want to delete this email?'}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={cancelDelete} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors">
                                {i18n.getTranslation('cancel_button') || 'Cancel'}
                            </button>
                            <button onClick={confirmDeleteAction} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
                                {i18n.getTranslation('trash_btn') || 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
