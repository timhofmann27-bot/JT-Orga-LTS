export const de = {
  loading: 'Laden...',
  error: 'Fehler',
  success: 'Erfolg',
  cancel: 'Abbrechen',
  confirm: 'Bestätigen',
  save: 'Speichern',
  delete: 'Löschen',
  edit: 'Bearbeiten',
  close: 'Schließen',
  login: 'Anmelden',
  logout: 'Abmelden',
  register: 'Registrieren',
  username: 'Benutzername',
  password: 'Passwort',
  email: 'E-Mail',
  home: 'Startseite',
  dashboard: 'Übersicht',
  events: 'Aktionen',
  members: 'Mitglieder',
  settings: 'Einstellungen',
  profile: 'Profil',
  notifications: 'Benachrichtigungen',
  offline: 'Keine Verbindung. App läuft im Offline-Modus.',
};

export const en = {
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  close: 'Close',
  login: 'Login',
  logout: 'Logout',
  register: 'Register',
  username: 'Username',
  password: 'Password',
  email: 'Email',
  home: 'Home',
  dashboard: 'Dashboard',
  events: 'Events',
  members: 'Members',
  settings: 'Settings',
  profile: 'Profile',
  notifications: 'Notifications',
  offline: 'No connection. App running in offline mode.',
};

export type Language = 'de' | 'en';
export type TranslationKey = keyof typeof de;

let currentLanguage: Language = 'de';
const listeners: Set<() => void> = new Set();

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  listeners.forEach(listener => listener());
}

export function getLanguage(): Language {
  try {
    const stored = localStorage.getItem('language') as Language;
    if (stored && (stored === 'de' || stored === 'en')) {
      return stored;
    }
  } catch (e) {}
  return 'de';
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const translations = currentLanguage === 'de' ? de : en;
  let text = translations[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  
  return text;
}

import React from 'react';

export function useTranslation() {
  const [lang, setLang] = React.useState<Language>(getLanguage());
  
  React.useEffect(() => {
    const listener = () => setLang(getLanguage());
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  
  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) => t(key, params),
    language: lang,
    setLanguage: setLanguage,
  };
}
