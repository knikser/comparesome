import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export type Language = 'ru' | 'en';

const STORAGE_KEY = 'comparesome-language';

const translations = {
  ru: {
    'app.title': 'сравнилка',
    'app.subtitle': 'Пространство для принятия решений',
    'nav.dashboard': 'Дашборд',
    'nav.comparisons': 'Сравнения',
    'nav.admin': 'Админ',
    'nav.settings': 'Настройки',
    'nav.logout': 'Выйти',
    'settings.title': 'Настройки пользователя',
    'settings.languageLabel': 'Язык интерфейса и ошибок API',
    'settings.save': 'Сохранить',
    'settings.saving': 'Сохраняем...',
    'settings.saved': 'Настройки сохранены',
    'settings.loadError': 'Не удалось загрузить настройки',
    'settings.saveError': 'Не удалось сохранить настройки',
    'settings.language.ru': 'Русский',
    'settings.language.en': 'English',
    'login.title': 'С возвращением',
    'login.hint': 'Стандартные данные администратора: admin / admin',
    'login.username': 'Имя пользователя',
    'login.password': 'Пароль',
    'login.submit': 'Войти',
    'login.submitting': 'Входим...',
    'login.error': 'Неизвестная ошибка входа',
    'changePassword.title': 'Смена пароля',
    'changePassword.hint': 'При первом входе нужно сменить пароль администратора по умолчанию.',
    'changePassword.current': 'Текущий пароль',
    'changePassword.new': 'Новый пароль (минимум 6 символов)',
    'changePassword.submit': 'Обновить пароль',
    'changePassword.submitting': 'Обновляем...',
    'changePassword.error': 'Не удалось сменить пароль',
    'dashboard.loadError': 'Не удалось загрузить дашборд',
    'dashboard.loading': 'Загрузка дашборда...',
    'dashboard.lastComparisons': 'Последние сравнения',
    'dashboard.lastComparisonsHint': 'Быстрый доступ к последним сессиям сравнения.',
    'dashboard.noComparisons': 'Сравнений пока нет.',
    'dashboard.createdBy': 'Создал(а): {name} | Вариантов: {count}',
    'dashboard.topRanked': 'Топ вариантов',
    'dashboard.variantItem': '{title} - ср. {avg} ({count} оценок)',
    'dashboard.topRated': 'Лучшие варианты',
    'dashboard.topRatedHint': 'По всем сравнениям, где вы участвуете.',
    'dashboard.topRatedItem': '{title} ({comparison}) - ср. {avg}',
    'comparisons.loadError': 'Не удалось загрузить сравнения',
    'comparisons.createError': 'Не удалось создать сравнение',
    'comparisons.createTitle': 'Создать сущность сравнения',
    'comparisons.createHint': 'Пример: квартиры, вакансии, поставщики и т.д.',
    'comparisons.entityName': 'Название сущности',
    'comparisons.selectUsers': 'Выберите до 4 дополнительных участников:',
    'comparisons.selectedUsers': 'Выбрано пользователей: {selected}/4 (вы включены автоматически)',
    'comparisons.create': 'Создать сравнение',
    'comparisons.creating': 'Создаём...',
    'comparisons.listTitle': 'Ваши сравнения',
    'comparisons.empty': 'Сравнения еще не созданы.',
    'comparisons.variantsCount': '{count} вариантов',
    'comparison.loadError': 'Не удалось загрузить сравнение',
    'comparison.createVariantError': 'Не удалось добавить вариант',
    'comparison.rateVariantError': 'Не удалось сохранить оценку',
    'comparison.loading': 'Загрузка сравнения...',
    'comparison.participants': 'Участники: {names}',
    'comparison.addVariant': 'Добавить вариант',
    'comparison.variantTitle': 'Название варианта',
    'comparison.description': 'Описание',
    'comparison.add': 'Добавить вариант',
    'comparison.adding': 'Добавляем...',
    'comparison.variants': 'Варианты',
    'comparison.noVariants': 'Вариантов пока нет.',
    'comparison.noDescription': 'Без описания.',
    'comparison.meta': 'Создал(а): {name} | Средняя оценка {avg} ({count} оценок)',
    'comparison.noRating': 'Вы еще не оценивали этот вариант.',
    'comparison.yourRating': 'Ваша оценка: {rank} | Плюсы: {pros} | Минусы: {cons}',
    'comparison.rank': 'Оценка (1..10)',
    'comparison.pros': 'Плюсы',
    'comparison.cons': 'Минусы',
    'comparison.save': 'Сохранить',
    'comparison.allRatings': 'Все персональные оценки',
    'comparison.ratingItem': '{name}: {rank} (плюсы: {pros}, минусы: {cons})',
    'admin.loadError': 'Не удалось загрузить админ-панель',
    'admin.createUserError': 'Не удалось создать пользователя',
    'admin.updateFlagError': 'Не удалось обновить feature flag',
    'admin.updateSettingsError': 'Не удалось обновить настройки',
    'admin.createUser': 'Создать пользователя',
    'admin.username': 'Имя пользователя',
    'admin.password': 'Пароль',
    'admin.admin': 'Админ',
    'admin.create': 'Создать пользователя',
    'admin.users': 'Пользователи',
    'admin.badgeAdmin': 'админ',
    'admin.badgeMustChangePassword': 'требуется смена пароля',
    'admin.featureFlags': 'Feature flags',
    'admin.enabled': 'включено',
    'admin.disabled': 'выключено',
    'admin.toggle': 'Переключить',
    'admin.settings': 'Настройки',
    'admin.maxVariants': 'Максимум вариантов на пользователя в одном сравнении',
    'admin.saveSettings': 'Сохранить настройки',
    'admin.loadingSettings': 'Загрузка настроек...'
  },
  en: {
    'app.title': 'compare',
    'app.subtitle': 'Decision workspace',
    'nav.dashboard': 'Dashboard',
    'nav.comparisons': 'Comparisons',
    'nav.admin': 'Admin',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'settings.title': 'User settings',
    'settings.languageLabel': 'UI and API errors language',
    'settings.save': 'Save',
    'settings.saving': 'Saving...',
    'settings.saved': 'Settings saved',
    'settings.loadError': 'Failed to load settings',
    'settings.saveError': 'Failed to save settings',
    'settings.language.ru': 'Russian',
    'settings.language.en': 'English',
    'login.title': 'Welcome back',
    'login.hint': 'Default admin credentials: admin / admin',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Login',
    'login.submitting': 'Signing in...',
    'login.error': 'Unknown login error',
    'changePassword.title': 'Change your password',
    'changePassword.hint': 'First login requires changing the default admin password.',
    'changePassword.current': 'Current password',
    'changePassword.new': 'New password (min 6 chars)',
    'changePassword.submit': 'Update password',
    'changePassword.submitting': 'Updating...',
    'changePassword.error': 'Password change failed',
    'dashboard.loadError': 'Failed to load dashboard',
    'dashboard.loading': 'Loading dashboard...',
    'dashboard.lastComparisons': 'Last comparisons',
    'dashboard.lastComparisonsHint': 'Quick access to the latest comparison sessions.',
    'dashboard.noComparisons': 'No comparisons yet.',
    'dashboard.createdBy': 'Created by {name} | Variants: {count}',
    'dashboard.topRanked': 'Top ranked variants',
    'dashboard.variantItem': '{title} - avg {avg} ({count} ratings)',
    'dashboard.topRated': 'Top rated variants',
    'dashboard.topRatedHint': 'Across all comparisons you are part of.',
    'dashboard.topRatedItem': '{title} ({comparison}) - avg {avg}',
    'comparisons.loadError': 'Failed to load comparisons',
    'comparisons.createError': 'Failed to create comparison',
    'comparisons.createTitle': 'Create comparison entity',
    'comparisons.createHint': 'Example entity: flats, jobs, suppliers, etc.',
    'comparisons.entityName': 'Entity name',
    'comparisons.selectUsers': 'Select up to 4 additional participants:',
    'comparisons.selectedUsers': 'Selected users: {selected}/4 (you are included automatically)',
    'comparisons.create': 'Create comparison',
    'comparisons.creating': 'Creating...',
    'comparisons.listTitle': 'Your comparisons',
    'comparisons.empty': 'No comparisons created yet.',
    'comparisons.variantsCount': '{count} variants',
    'comparison.loadError': 'Failed to load comparison',
    'comparison.createVariantError': 'Failed to add variant',
    'comparison.rateVariantError': 'Failed to rate variant',
    'comparison.loading': 'Loading comparison...',
    'comparison.participants': 'Participants: {names}',
    'comparison.addVariant': 'Add variant',
    'comparison.variantTitle': 'Variant title',
    'comparison.description': 'Description',
    'comparison.add': 'Add variant',
    'comparison.adding': 'Adding...',
    'comparison.variants': 'Variants',
    'comparison.noVariants': 'No variants yet.',
    'comparison.noDescription': 'No description.',
    'comparison.meta': 'Created by {name} | Avg rank {avg} ({count} ratings)',
    'comparison.noRating': 'No personal rating yet.',
    'comparison.yourRating': 'Your rank: {rank} | Pros: {pros} | Cons: {cons}',
    'comparison.rank': 'Rank (1..10)',
    'comparison.pros': 'Pros',
    'comparison.cons': 'Cons',
    'comparison.save': 'Save',
    'comparison.allRatings': 'All personal ratings',
    'comparison.ratingItem': '{name}: {rank} (pros: {pros}, cons: {cons})',
    'admin.loadError': 'Failed to load admin panel',
    'admin.createUserError': 'Failed to create user',
    'admin.updateFlagError': 'Failed to update feature flag',
    'admin.updateSettingsError': 'Failed to update settings',
    'admin.createUser': 'Create user',
    'admin.username': 'Username',
    'admin.password': 'Password',
    'admin.admin': 'Admin',
    'admin.create': 'Create user',
    'admin.users': 'Users',
    'admin.badgeAdmin': 'admin',
    'admin.badgeMustChangePassword': 'must change password',
    'admin.featureFlags': 'Feature flags',
    'admin.enabled': 'enabled',
    'admin.disabled': 'disabled',
    'admin.toggle': 'Toggle',
    'admin.settings': 'Settings',
    'admin.maxVariants': 'Max variants per user per comparison',
    'admin.saveSettings': 'Save settings',
    'admin.loadingSettings': 'Loading settings...'
  }
} as const;

export type TranslationKey = keyof (typeof translations)['ru'];

type TranslateParams = Record<string, string | number>;

function format(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'en' ? 'en' : 'ru';
}

let currentLanguage: Language = 'ru';

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

function setCurrentLanguage(value: Language) {
  currentLanguage = value;
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (value: Language) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [language, setLanguageState] = useState<Language>(() =>
    normalizeLanguage(localStorage.getItem(STORAGE_KEY))
  );

  useEffect(() => {
    if (user?.language) {
      const next = normalizeLanguage(user.language);
      setLanguageState(next);
      setCurrentLanguage(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, [user?.language]);

  useEffect(() => {
    setCurrentLanguage(language);
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next: Language) => {
        setLanguageState(next);
        if (user && user.language !== next) {
          updateUser({ ...user, language: next });
        }
      },
      t: (key: TranslationKey, params?: TranslateParams) =>
        format(translations[language][key] ?? key, params)
    }),
    [language, updateUser, user]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
