/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeMembreBranche } from '../lib/membreBranche';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    branch: string;
    setBranch: (branch: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const BRANCH_THEMES: Record<string, { start: string; end: string; rgb: string }> = {
    enfant: { start: '#9F9F11D4', end: '#9F9F11D4', rgb: '255, 255, 0' },
    archange: { start: '#FF0000', end: '#FF0000', rgb: '255, 0, 0' },
    perame: { start: '#0000FF', end: '#0000FF', rgb: '0, 0, 255' },
    // Anciennes valeurs (rétrocompatibilité)
    anges: { start: '#9F9F11D4', end: '#9F9F11D4', rgb: '255, 255, 0' },
    archanges: { start: '#FF0000', end: '#FF0000', rgb: '255, 0, 0' },
    perames: { start: '#0000FF', end: '#0000FF', rgb: '0, 0, 255' },
    pérames: { start: '#0000FF', end: '#0000FF', rgb: '0, 0, 255' },
    ka: { start: '#FF3D71', end: '#FF9E7D', rgb: '255, 61, 113' },
};

const DEFAULT_THEME = { start: '#9F9F11D4', end: '#9F9F11D4', rgb: '159, 159, 17' };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('ave-theme');
        return (saved as Theme) || 'dark';
    });
    const [branch, setBranchState] = useState<string>('enfant');

    // 1. Gérer le mode sombre/clair
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('ave-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    const applyBranchTheme = useCallback((branchName: string) => {
        if (!branchName) return;
        const key = normalizeMembreBranche(branchName);
        const colors = BRANCH_THEMES[key] || DEFAULT_THEME;

        const root = document.documentElement;
        root.style.setProperty('--color-primary-start', colors.start);
        root.style.setProperty('--color-primary-end', colors.end);
        root.style.setProperty('--color-primary-rgb', colors.rgb);
    }, []);

    const setBranch = useCallback((newBranch: string) => {
        if (!newBranch) return;
        setBranchState(newBranch);
        applyBranchTheme(newBranch);
    }, [applyBranchTheme]);

    // 3. Récupérer et écouter les changements de profil de l'utilisateur
    useEffect(() => {
        let isMounted = true;

        // 3. Récupérer et écouter les changements de profil de l'utilisateur
        // On s'appuie UNIQUEMENT sur onAuthStateChange qui se déclenche automatiquement au démarrage
        // Cela évite le deadlock de localStorage causé par de multiples appels concurrents à getSession()

        // Écouter les changements d'état d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('branche')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profile?.branche && isMounted) {
                        setBranch(profile.branche);
                    }
                } else {
                    if (isMounted) {
                        setBranch('enfant');
                    }
                }
            } catch (err) {
                console.error("ThemeContext auth listener error:", err);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [setBranch]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, branch, setBranch }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
