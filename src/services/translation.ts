import i18n from 'i18n';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SupportedLanguages, SUPPORTED_LANGUAGES } from '../constants/constants.js';

// Filter out numeric keys from enum (TypeScript enums have reverse mappings)
const localeCodes = SUPPORTED_LANGUAGES.filter(l => 
  typeof l === 'string'
) as string[];

i18n.configure({
  locales: localeCodes,
  directory: join(__dirname, '../../locales'),
  defaultLocale: SupportedLanguages.EN,
  queryParameter: 'lang',
  autoReload: true,
  updateFiles: false,
  objectNotation: true,
  api: {
    __: 't',
  }
});

// Extend Express Response type
declare global {
  namespace Express {
    interface Response {
      t: typeof i18n.__;
    }
  }
}

type Replacements = Record<string, string | number>;

// Validation function
const validateReplacements = (replacements?: Replacements | null): Replacements => {
  if (!replacements || typeof replacements !== 'object') {
    return {};
  }
  return replacements;
};

export const getTranslation = (
  key: string,
  lang: SupportedLanguages
): string => {
  return i18n.__(
    { phrase: key, locale: lang }
  );
};

export const getTranslationWithReplacement = (
  key: string,
  lang: SupportedLanguages,
  replacements: Replacements
): string => {  
  // Ensure that the translation key is properly formatted and the replacements are passed correctly
  // Convert all values in replacements to strings if they are numbers
  const stringReplacements: Record<string, string> = Object.fromEntries(
    Object.entries(replacements).map(([key, value]) => [key, String(value)])
  );

  console.log(stringReplacements);

  // Call i18n.__ with updated replacements
  return i18n.__({ phrase: key, locale: lang }, stringReplacements);
};

// Without replacements
// const message = getTranslation('welcome', 'en');

// With replacements
// const welcomeMessage = getTranslation('welcome_user', 'es', { 
//   username: 'Maria' 
// });