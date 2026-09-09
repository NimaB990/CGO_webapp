const LANGUAGE_LOCALES = {
  English: 'en-US',
  Sinhala: 'si-LK',
  Tamil: 'ta-LK',
};

export const getStoredLanguage = () => localStorage.getItem('securetrack-language') || 'English';

export const getStoredTimezone = () => localStorage.getItem('securetrack-timezone') || 'Asia/Colombo';

export const applyUserPreferences = (language, timezone) => {
  localStorage.setItem('securetrack-language', language);
  localStorage.setItem('securetrack-timezone', timezone);
  document.documentElement.lang = LANGUAGE_LOCALES[language] || 'en-US';
  window.dispatchEvent(new CustomEvent('user-preferences-changed', {
    detail: { language, timezone },
  }));
};

export const formatUserDateTime = (value) => {
  if (!value) return '';

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[getStoredLanguage()] || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: getStoredTimezone(),
  }).format(new Date(value));
};
