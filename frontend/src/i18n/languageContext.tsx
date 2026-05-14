import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'fr';

type Dictionary = Record<string, string>;

const dictionaries: Record<Language, Dictionary> = {
  en: {
    'language.label': 'Language',
    'language.english': 'English',
    'language.french': 'French',

    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.clients': 'Clients',
    'nav.users': 'Users',
    'nav.staff': 'Staff',
    'nav.services': 'Services',
    'nav.tenants': 'Tenants',
    'nav.more': 'More',
    'nav.home': 'Home',
    'nav.settings': 'Settings',
    'nav.manageTags': 'Manage Tags',
    'nav.businessSettings': 'Business Settings',
    'nav.templates': 'Templates',
    'nav.appearance': 'Appearance',
    'nav.logOut': 'Log out',

    'header.search': 'Search...',
    'header.profile': 'Profile',
    'header.accountSettings': 'Account Settings',

    'login.welcomeBack': 'Welcome back',
    'login.signInToAccount': 'Sign in to your account',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.forgotPassword': 'Forgot password?',
    'login.signIn': 'Sign in',
    'login.signingIn': 'Signing in...',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'login.invalidCredentials': 'Invalid email or password.',
    'login.unexpectedError': 'An unexpected error occurred.',
    'login.loginFailed': 'Login failed:',
    'login.serverUnreachable': 'Unable to reach server. Please try again.',
    'login.genericError': 'Something went wrong.',
  },
  fr: {
    'language.label': 'Langue',
    'language.english': 'Anglais',
    'language.french': 'Francais',

    'nav.dashboard': 'Tableau de bord',
    'nav.calendar': 'Calendrier',
    'nav.clients': 'Clients',
    'nav.users': 'Utilisateurs',
    'nav.staff': 'Equipe',
    'nav.services': 'Services',
    'nav.tenants': 'Locataires',
    'nav.more': 'Plus',
    'nav.home': 'Accueil',
    'nav.settings': 'Parametres',
    'nav.manageTags': 'Gerer les tags',
    'nav.businessSettings': 'Parametres entreprise',
    'nav.templates': 'Modeles',
    'nav.appearance': 'Apparence',
    'nav.logOut': 'Se deconnecter',

    'header.search': 'Rechercher...',
    'header.profile': 'Profil',
    'header.accountSettings': 'Parametres du compte',

    'login.welcomeBack': 'Bon retour',
    'login.signInToAccount': 'Connectez-vous a votre compte',
    'login.email': 'Email',
    'login.password': 'Mot de passe',
    'login.forgotPassword': 'Mot de passe oublie ?',
    'login.signIn': 'Se connecter',
    'login.signingIn': 'Connexion...',
    'login.showPassword': 'Afficher le mot de passe',
    'login.hidePassword': 'Masquer le mot de passe',
    'login.invalidCredentials': 'Email ou mot de passe invalide.',
    'login.unexpectedError': 'Une erreur inattendue est survenue.',
    'login.loginFailed': 'Echec de connexion :',
    'login.serverUnreachable': 'Impossible de joindre le serveur. Reessayez.',
    'login.genericError': 'Une erreur est survenue.',
  },
};

const STORAGE_KEY = 'pamplia.language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'fr') return stored;

  const browser = navigator.language?.toLowerCase() ?? '';
  if (browser.startsWith('fr')) return 'fr';

  return 'en';
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  };

  const translate = (lang: Language, key: string): string => {
    return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key: string) => translate(language, key),
    locale: language === 'fr' ? 'fr-FR' : 'en-US',
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
