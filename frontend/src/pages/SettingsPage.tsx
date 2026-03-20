import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { type Language, useLanguage } from '../i18n';

export function SettingsPage() {
  const { token, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!token) {
      return;
    }
    api
      .meSettings(token)
      .then((response) => {
        const next = response.language;
        setSelectedLanguage(next);
        setLanguage(next);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : t('settings.loadError'));
      });
  }, [token, setLanguage, t]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await api.updateMeSettings(token, selectedLanguage);
      updateUser(response.user);
      setLanguage(response.user.language);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card section-card">
      <div className="card-body">
        <h2 className="h5 page-title">{t('settings.title')}</h2>
        <form onSubmit={onSubmit} className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label">{t('settings.languageLabel')}</label>
            <select
              className="form-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as Language)}
            >
              <option value="ru">{t('settings.language.ru')}</option>
              <option value="en">{t('settings.language.en')}</option>
            </select>
          </div>
          <div className="col-12 col-md-auto">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </form>
        {saved ? <div className="alert alert-success py-2 mt-3 mb-0">{t('settings.saved')}</div> : null}
        {error ? <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div> : null}
      </div>
    </section>
  );
}
